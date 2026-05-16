import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    const db = getPool()!
    const emailKey = email.toLowerCase().trim()

    // Check admin has approved the OTP (is_verified = true, correct columns)
    const { rows: otpRows } = await db.query(
      `SELECT id FROM mobile_verification_otps
       WHERE email = $1 AND purpose = 'password_reset' AND is_verified = true AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [emailKey]
    )

    if (otpRows.length === 0) {
      return NextResponse.json({ error: "OTP not approved by admin yet. Please wait." }, { status: 403 })
    }

    // Update password
    const { rowCount } = await db.query(
      `UPDATE participants SET password_hash = $1, plain_password = $2, updated_at = NOW() WHERE email = $3`,
      [newPassword, newPassword, emailKey]
    )

    if (!rowCount || rowCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Delete used OTP
    await db.query(
      "DELETE FROM mobile_verification_otps WHERE email = $1 AND purpose = 'password_reset'",
      [emailKey]
    )

    await db.query(
      "INSERT INTO activity_logs (actor_email, action, details) VALUES ($1, $2, $3)",
      [emailKey, "password_reset_completed", "User reset password via forgot password"]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Password updated. You can now login with your new password." })
  } catch (err: any) {
    console.error("[set-password]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
