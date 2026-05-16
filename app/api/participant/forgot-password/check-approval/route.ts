import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    const db = getPool()!

    // Check if admin has approved (is_verified = true) the password reset OTP for this email
    const { rows } = await db.query(
      `SELECT id, otp_code, is_verified FROM mobile_verification_otps 
       WHERE email = $1 
       AND purpose = 'password_reset'
       AND is_verified = true
       AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase().trim()]
    )

    if (rows.length === 0) {
      return NextResponse.json({ success: true, approved: false, message: "OTP not yet approved by admin" })
    }

    return NextResponse.json({
      success: true,
      approved: true,
      otp: rows[0].otp_code,
      message: "OTP has been approved by admin"
    })
  } catch (error: any) {
    console.error("[check-approval]:", error)
    return NextResponse.json({ success: false, error: "Failed to check OTP approval" }, { status: 500 })
  }
}
