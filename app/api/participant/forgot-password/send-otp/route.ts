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

    // Store password reset OTP in participants table
    await db.query(
      `UPDATE participants 
       SET password_reset_otp = $1, 
           password_reset_otp_verified = false,
           password_reset_otp_created_at = NOW()
       WHERE email = $2`,
      [otp, emailKey]
    )

    return NextResponse.json({
      success: true,
      otp,
      mobileNumber: participant.mobile_number,
      expiresIn: 600
    })
  } catch (err: any) {
    console.error("[forgot-password send-otp]:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
