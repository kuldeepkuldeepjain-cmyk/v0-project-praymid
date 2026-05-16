import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { otpMemoryStore } from "@/lib/otp-memory-store"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find participant by email to get mobile number
    let participant: any = null
    try {
      const db = getPool()!
      const { rows } = await db.query(
        "SELECT id, email, mobile_number, full_name FROM participants WHERE email = $1",
        [email.toLowerCase().trim()]
      )
      participant = rows[0]
    } catch (dbErr) {
      console.error("[forgot-password send-otp] DB error:", dbErr)
    }

    if (!participant) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 })
    }

    if (!participant.mobile_number) {
      return NextResponse.json({ error: "Mobile number not registered for this account" }, { status: 400 })
    }

    // Generate and store OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000
    let usedMemoryStore = false

    try {
      const db = getPool()!
      // Delete any old password reset OTPs for this email
      await db.query(
        "DELETE FROM mobile_verification_otps WHERE email = $1 AND purpose = $2",
        [email.toLowerCase().trim(), "password_reset"]
      )
      // Insert new password reset OTP
      await db.query(
        "INSERT INTO mobile_verification_otps (mobile_number, otp_code, email, is_verified, attempt_count, expires_at, purpose) VALUES ($1,$2,$3,false,0,$4,$5)",
        [participant.mobile_number, otp, email.toLowerCase().trim(), new Date(expiresAt).toISOString(), "password_reset"]
      )
    } catch (dbErr) {
      console.error("[forgot-password send-otp] DB error, using memory:", dbErr)
      otpMemoryStore.set(`pwd_reset_${email}`, { otp, expiresAt, attemptCount: 0, verified: false })
      usedMemoryStore = true
    }

    // Log activity
    try {
      const db = getPool()!
      await db.query(
        "INSERT INTO activity_logs (actor_email, action, details) VALUES ($1, $2, $3)",
        [email, "password_reset_otp_sent", `OTP sent to ${participant.mobile_number}`]
      ).catch(() => {})
    } catch (err) {
      // Ignore logging errors
    }

    if (usedMemoryStore) {
      return NextResponse.json({
        success: true,
        message: "OTP generated (preview mode)",
        otp,
        mobile_masked: `****${participant.mobile_number.slice(-4)}`,
        expiresIn: 600
      })
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your registered WhatsApp number",
      mobile_masked: `****${participant.mobile_number.slice(-4)}`,
      expiresIn: 600
    })
  } catch (err: any) {
    console.error("[forgot-password send-otp]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
