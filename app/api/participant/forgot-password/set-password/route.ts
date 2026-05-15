import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        error: "Email, OTP, and new password are required" 
      }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ 
        success: false, 
        error: "Password must be at least 4 characters" 
      }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Find participant
    const participantRows = await query(
      `SELECT id, email FROM participants WHERE email = $1 LIMIT 1`,
      [emailKey]
    ) as any[]

    if (participantRows.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const participant = participantRows[0]

    // Find OTP record with purpose = 'password_reset' and status = 'approved'
    const otpRows = await query(
      `SELECT id, otp_code, otp_purpose, status, expires_at
       FROM otp_records
       WHERE participant_email = $1 AND otp_purpose = 'password_reset' AND status = 'approved'
       ORDER BY created_at DESC LIMIT 1`,
      [emailKey]
    ) as any[]

    if (otpRows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No approved OTP found. Please request a new one." 
      }, { status: 400 })
    }

    const otpRecord = otpRows[0]

    // Check if OTP has expired
    const expiresAt = new Date(otpRecord.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ 
        success: false, 
        error: "OTP has expired. Please request a new one." 
      }, { status: 400 })
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid OTP. Please try again." 
      }, { status: 400 })
    }

    // Update password in database
    await execute(
      `UPDATE participants 
       SET password_hash = $1, plain_password = $2, updated_at = NOW()
       WHERE id = $3`,
      [newPassword, newPassword, participant.id]
    )

    // Mark OTP as used
    await execute(
      `UPDATE otp_records SET status = 'used', used_at = NOW() WHERE id = $1`,
      [otpRecord.id]
    )

    // Log activity
    await execute(
      `INSERT INTO activity_logs (actor_email, action, details, target_type)
       VALUES ($1, 'password_reset_via_otp', $2, 'participant')`,
      [emailKey, `Password reset for ${emailKey}`]
    ).catch(() => {})

    // Send notification
    await execute(
      `INSERT INTO notifications (user_email, type, title, message)
       VALUES ($1, 'success', 'Password Reset Successful', $2)`,
      [emailKey, 'Your password has been successfully reset. You can now login with your new password.']
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password."
    })
  } catch (err) {
    console.error("[v0] Forgot password set error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
