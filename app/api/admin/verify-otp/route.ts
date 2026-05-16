import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId, otp, adminEmail } = await request.json()

    if (!participantId || !otp) {
      return NextResponse.json({ success: false, error: "Participant ID and OTP are required" }, { status: 400 })
    }

    // First check if it's a registration OTP
    let registrationRows = await query(
      "SELECT id, full_name, email, whatsapp_otp, otp_verified FROM participants WHERE id = $1 LIMIT 1",
      [participantId]
    )

    if (registrationRows.length > 0) {
      // Handle registration OTP
      const participant = registrationRows[0] as any

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
      await execute(
        `UPDATE participants SET otp_verified = true, otp_verified_at = NOW(), otp_verified_by = $1 WHERE id = $2`,
        [adminEmail || "admin", participantId]
      )

      // Log action
      await execute(
        `INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)`,
        ["OTP_VERIFIED", `WhatsApp OTP verified for participant ${participant.email}`, adminEmail || "admin"]
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `OTP verified successfully for ${participant.full_name || participant.email}`,
      })
    }

    // Check if it's a password reset OTP
    let passwordResetRows = await query(
      "SELECT id, otp, verified FROM mobile_verification_otps WHERE id = $1 AND purpose = 'password_reset' LIMIT 1",
      [participantId]
    )

    if (passwordResetRows.length > 0) {
      // Handle password reset OTP
      const otpRecord = passwordResetRows[0] as any

      if (otpRecord.verified) {
        return NextResponse.json({ success: false, error: "OTP already verified" }, { status: 400 })
      }

      if (!otpRecord.otp) {
        return NextResponse.json({ success: false, error: "No OTP found" }, { status: 400 })
      }

      if (otpRecord.otp.trim() !== otp.trim()) {
        return NextResponse.json({ success: false, error: "Invalid OTP. Please check and try again." }, { status: 401 })
      }

      // Mark as verified
      await execute(
        `UPDATE mobile_verification_otps SET verified = true WHERE id = $1`,
        [participantId]
      )

      // Log action
      await execute(
        `INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)`,
        ["PASSWORD_RESET_OTP_VERIFIED", `Password reset OTP verified`, adminEmail || "admin"]
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: "Password reset OTP verified successfully",
      })
    }

    return NextResponse.json({ success: false, error: "Participant or OTP not found" }, { status: 404 })
  } catch (error: any) {
    console.error("[verify-otp] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Verification failed" }, { status: 500 })
  }
}
