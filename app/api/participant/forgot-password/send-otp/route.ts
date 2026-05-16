import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const db = getPool()!
    const emailKey = email.toLowerCase().trim()

    // Find participant by email
    const { rows: pRows } = await db.query(
      "SELECT id, email, mobile_number, full_name FROM participants WHERE email = $1 LIMIT 1",
      [emailKey]
    )

    if (!pRows[0]) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 })
    }

    const participant = pRows[0]

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Delete any existing password reset OTPs for this email
    await db.query(
      "DELETE FROM mobile_verification_otps WHERE email = $1 AND purpose = 'password_reset'",
      [emailKey]
    )

    // Insert new password reset OTP with correct column names
    await db.query(
      `INSERT INTO mobile_verification_otps 
       (mobile_number, otp_code, email, is_verified, attempt_count, expires_at, purpose) 
       VALUES ($1, $2, $3, false, 0, $4, 'password_reset')`,
      [participant.mobile_number, otp, emailKey, expiresAt]
    )

    return NextResponse.json({
      success: true,
      otp,                               // returned so modal can display it
      mobileNumber: participant.mobile_number,
      expiresIn: 600
    })
  } catch (err: any) {
    console.error("[forgot-password send-otp]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
