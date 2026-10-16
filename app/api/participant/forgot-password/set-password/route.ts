import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Re-check the verified reset OTP and its expiry before changing the password.
    const checkRows = await query(
      `SELECT password_reset_otp, password_reset_otp_verified, password_reset_otp_created_at FROM participants WHERE email = $1`,
      [emailKey]
    )

    if (!checkRows || checkRows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const resetRecord = checkRows[0]
    if (!resetRecord.password_reset_otp_verified || String(otp || "").trim() !== String(resetRecord.password_reset_otp || "")) {
      return NextResponse.json({ error: "Verify the password reset code first." }, { status: 403 })
    }
    if (!resetRecord.password_reset_otp_created_at || Date.now() - new Date(resetRecord.password_reset_otp_created_at).getTime() > 10 * 60 * 1000) {
      return NextResponse.json({ error: "This reset code has expired. Request a new code." }, { status: 400 })
    }

    // Update password and clear OTP
    await execute(
      `UPDATE participants SET password_hash = $1, plain_password = $2, password_reset_otp = NULL, password_reset_otp_verified = false, updated_at = NOW() 
       WHERE email = $3`,
      [newPassword, newPassword, emailKey]
    )

    return NextResponse.json({ success: true, message: "Password updated successfully. You can now login." })
  } catch (err: any) {
    console.error("[set-password]:", err.message || err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
