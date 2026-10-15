import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Check if admin has approved the password reset OTP
    const rows = await query(
      `SELECT password_reset_otp, password_reset_otp_verified, password_reset_otp_created_at 
       FROM participants 
       WHERE email = $1`,
      [emailKey]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, approved: false, message: "Account not found" })
    }

    const participant = rows[0]
    const submittedOtp = String(otp || "").trim()
    if (!/^\d{6}$/.test(submittedOtp) || submittedOtp !== String(participant.password_reset_otp || "")) {
      return NextResponse.json({ success: false, approved: false, error: "The verification code is incorrect." }, { status: 400 })
    }

    // Check if OTP has expired (10 minutes)
    if (participant.password_reset_otp_created_at) {
      const createdAt = new Date(participant.password_reset_otp_created_at).getTime()
      const now = Date.now()
      const tenMinutes = 10 * 60 * 1000

      if (now - createdAt > tenMinutes) {
        return NextResponse.json({ success: true, approved: false, message: "OTP has expired" })
      }
    }

    await query(`UPDATE participants SET password_reset_otp_verified = true WHERE email = $1`, [emailKey])
    return NextResponse.json({ success: true, approved: true, message: "OTP verified" })
  } catch (error: any) {
    console.error("[check-approval]:", error.message || error)
    return NextResponse.json({ success: false, error: error.message || "Failed to check OTP approval" }, { status: 500 })
  }
}
