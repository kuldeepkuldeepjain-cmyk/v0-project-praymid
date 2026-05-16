import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const otps = await query(
      `SELECT id, participant_email, otp_code, otp_purpose, created_at, expires_at, is_approved, approved_at, approved_by
       FROM otp_records
       WHERE otp_purpose = 'password_reset' AND is_approved = false
       ORDER BY created_at DESC
       LIMIT 100`,
      []
    )

    return NextResponse.json({ success: true, otps })
  } catch (err: any) {
    console.error("[v0] Error fetching password reset OTPs:", err.message)
    return NextResponse.json({ success: false, error: "Failed to fetch OTPs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { otpId, action } = await request.json()

    if (!otpId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
    }

    const otpRecord = await query(
      `SELECT id, participant_email, otp_code, otp_purpose, is_approved FROM otp_records WHERE id = $1 LIMIT 1`,
      [otpId]
    )

    if (otpRecord.length === 0) {
      return NextResponse.json({ success: false, error: "OTP not found" }, { status: 404 })
    }

    const otp = (otpRecord as any[])[0]

    if (otp.is_approved) {
      return NextResponse.json({ success: false, error: "OTP already approved" }, { status: 400 })
    }

    if (action === "approve") {
      // Mark OTP as approved
      await execute(
        `UPDATE otp_records
         SET is_approved = true, approved_at = NOW(), approved_by = $1
         WHERE id = $2`,
        [auth.adminEmail, otpId]
      )

      // Activity log
      await execute(
        `INSERT INTO activity_logs (actor_email, action, details, target_type)
         VALUES ($1, 'approve_password_reset_otp', $2, 'otp_record')`,
        [auth.adminEmail, `Approved password reset OTP for ${otp.participant_email}`]
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Password reset OTP approved for ${otp.participant_email}`,
        participantEmail: otp.participant_email,
      })
    } else {
      // Reject/delete OTP
      await execute(
        `DELETE FROM otp_records WHERE id = $1`,
        [otpId]
      )

      // Activity log
      await execute(
        `INSERT INTO activity_logs (actor_email, action, details, target_type)
         VALUES ($1, 'reject_password_reset_otp', $2, 'otp_record')`,
        [auth.adminEmail, `Rejected password reset OTP for ${otp.participant_email}`]
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Password reset OTP rejected for ${otp.participant_email}`,
        participantEmail: otp.participant_email,
      })
    }
  } catch (err: any) {
    console.error("[v0] Error processing password reset OTP:", err.message)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
