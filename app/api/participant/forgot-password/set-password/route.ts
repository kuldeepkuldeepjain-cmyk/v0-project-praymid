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

    // Check admin has approved the OTP
    const { rows: checkRows } = await db.query(
      `SELECT password_reset_otp_verified FROM participants WHERE email = $1`,
      [emailKey]
    )

    if (checkRows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (!checkRows[0].password_reset_otp_verified) {
      return NextResponse.json({ error: "OTP not approved by admin yet" }, { status: 403 })
    }

    // Update password and clear OTP
    await db.query(
      `UPDATE participants SET password_hash = $1, plain_password = $2, password_reset_otp = NULL, password_reset_otp_verified = false, updated_at = NOW() 
       WHERE email = $3`,
      [newPassword, newPassword, emailKey]
    )

    return NextResponse.json({ success: true, message: "Password updated successfully. You can now login." })
  } catch (err: any) {
    console.error("[set-password]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
