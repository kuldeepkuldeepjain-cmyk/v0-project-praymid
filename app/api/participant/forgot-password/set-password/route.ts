import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { otpMemoryStore } from "@/lib/otp-memory-store"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and password are required" }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()
    const otpKey = `pwd_reset_${emailKey}`

    // Check OTP verification status in database
    let otpData: any = null
    let isVerified = false

    try {
      const db = getPool()!
      const { rows } = await db.query(
        "SELECT is_verified, otp_code, expires_at FROM mobile_verification_otps WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1",
        [emailKey, "password_reset"]
      )
      otpData = rows[0]

      if (otpData) {
        isVerified = otpData.is_verified === true
        if (new Date(otpData.expires_at) < new Date()) {
          return NextResponse.json({ error: "OTP has expired" }, { status: 400 })
        }
      }
    } catch (dbErr) {
      console.error("[set-password] DB error:", dbErr)
      // Check memory store
      const memoryData = otpMemoryStore.get(otpKey)
      if (memoryData && memoryData.verified) {
        isVerified = true
      }
    }

    if (!isVerified) {
      return NextResponse.json({ error: "OTP not verified by admin" }, { status: 403 })
    }

    // Update password in database
    try {
      const db = getPool()!

      // Get participant ID
      const { rows: participantRows } = await db.query(
        "SELECT id FROM participants WHERE email = $1",
        [emailKey]
      )

      if (participantRows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const participantId = participantRows[0].id

      // Update password (both password_hash and plain_password for plain text storage)
      await db.query(
        "UPDATE participants SET password_hash = $1, plain_password = $2, updated_at = NOW() WHERE email = $3",
        [newPassword, newPassword, emailKey]
      )

      // Mark OTP as used
      await db.query(
        "UPDATE mobile_verification_otps SET is_verified = false WHERE email = $1 AND purpose = $2",
        [emailKey, "password_reset"]
      )

      // Log activity
      await db.query(
        "INSERT INTO activity_logs (actor_email, action, details) VALUES ($1, $2, $3)",
        [emailKey, "password_reset_completed", "User successfully reset password"]
      ).catch(() => {})

      // Notify user
      await db.query(
        "INSERT INTO notifications (user_email, type, title, message) VALUES ($1, $2, $3, $4)",
        [emailKey, "success", "Password Reset Successful", "Your password has been updated. You can now login with your new password."]
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: "Password updated successfully. You can now login with your new password."
      })
    } catch (err: any) {
      console.error("[set-password] Error:", err)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }
  } catch (err: any) {
    console.error("[set-password]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
