import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Find participant by email
    const rows = await query(
      `SELECT id, email, mobile_number, country_code, full_name 
       FROM participants 
       WHERE email = $1 LIMIT 1`,
      [emailKey]
    ) as any[]

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Email not found" }, { status: 404 })
    }

    const participant = rows[0]
    if (!participant.mobile_number) {
      return NextResponse.json({ 
        success: false, 
        error: "No mobile number registered. Please contact support." 
      }, { status: 400 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Store OTP with purpose = 'password_reset'
    await execute(
      `INSERT INTO otp_records (participant_email, participant_id, otp_code, mobile_number, otp_purpose, expires_at, created_at)
       VALUES ($1, $2, $3, $4, 'password_reset', $5, NOW())`,
      [emailKey, participant.id, otp, participant.mobile_number, expiresAt.toISOString()]
    )

    // Send OTP via WhatsApp (same as registration)
    try {
      const countryCode = participant.country_code || "+91"
      const fullPhone = `${countryCode}${participant.mobile_number}`.replace(/\D/g, "")
      
      const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/ACe04f2a3c8da5c0a1bb1d9c5e5c5c5c5/Messages.json", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`ACe04f2a3c8da5c0a1bb1d9c5e5c5c5c5:${process.env.TWILIO_AUTH_TOKEN || ""}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
          To: `whatsapp:+${fullPhone}`,
          Body: `Your password reset OTP is: ${otp}\n\nThis OTP will expire in 5 minutes. Do not share this with anyone.\n\nPyramid Partyworks`,
        }).toString(),
      }).catch(() => null)
    } catch (err) {
      console.error("[v0] WhatsApp send failed:", err)
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${participant.mobile_number}. Please wait for admin approval.`,
      email: emailKey,
      mobile_masked: `${participant.mobile_number.slice(-4).padStart(participant.mobile_number.length, '*')}`,
    })
  } catch (err) {
    console.error("[v0] Forgot password send OTP error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
