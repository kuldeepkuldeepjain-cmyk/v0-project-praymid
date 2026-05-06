import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId, otp, adminEmail } = await request.json()

    if (!participantId || !otp) {
      return NextResponse.json({ success: false, error: "Participant ID and OTP are required" }, { status: 400 })
    }

    const db = getPool()!

    // Fetch participant
    const result = await db.query(
      "SELECT id, full_name, email, whatsapp_otp, otp_verified FROM participants WHERE id = ?LIMIT 1",
      [participantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant = result[0]

    if (participant.otp_verified) {
      return NextResponse.json({ success: false, error: "OTP already verified for this participant" }, { status: 400 })
    }

    if (!participant.whatsapp_otp) {
      return NextResponse.json({ success: false, error: "No OTP found for this participant" }, { status: 400 })
    }

    if (participant.whatsapp_otp.trim() !== otp.trim()) {
      return NextResponse.json({ success: false, error: "Invalid OTP. Please check and try again." }, { status: 401 })
    }

    // Mark as verified
    await db.query(
      `UPDATE participants SET otp_verified = true, otp_verified_at = NOW(), otp_verified_by = ?WHERE id = $2`,
      [adminEmail || "admin", participantId]
    )

    // Log action
    await db.query(
      `INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)`,
      ["OTP_VERIFIED", `WhatsApp OTP verified for participant ${participant.email}`, adminEmail || "admin"]
    ).catch(() => { })

    return NextResponse.json({
      success: true,
      message: `OTP verified successfully for ${participant.full_name || participant.email}`,
    })
  } catch (error: any) {
    console.error("[verify-otp] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Verification failed" }, { status: 500 })
  }
}
