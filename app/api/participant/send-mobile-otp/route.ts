import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import twilio from "twilio"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, email } = await request.json()

    if (!mobile_number || !email) {
      return NextResponse.json({ error: "Mobile number and email are required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check duplicates
    const { data: existingMobile } = await supabase
      .from("participants")
      .select("id")
      .eq("mobile_number", mobile_number)
      .maybeSingle()

    if (existingMobile) {
      return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })
    }

    const { data: existingEmail } = await supabase
      .from("participants")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 })
    }

    // Clean up old OTPs
    await supabase
      .from("mobile_verification_otps")
      .delete()
      .eq("mobile_number", mobile_number)

    const otp = generateOTP()

    const { error: otpError } = await supabase
      .from("mobile_verification_otps")
      .insert({
        mobile_number,
        otp_code: otp,
        email,
        is_verified: false,
        attempt_count: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

    if (otpError) {
      console.error("[send-otp] DB insert error:", otpError)
      return NextResponse.json({ error: "Failed to save OTP record" }, { status: 500 })
    }

    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[send-otp] Twilio credentials missing")
      return NextResponse.json({ error: "SMS service not configured" }, { status: 500 })
    }

    const client = twilio(accountSid, authToken)

    await client.messages.create({
      body: `Your Praymid verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      from: fromNumber,
      to: mobile_number,
    })

    return NextResponse.json(
      { success: true, message: "OTP sent to your mobile number", expiresIn: 600 },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("[send-otp] Error:", error)
    const msg = error instanceof Error ? error.message : "Failed to send OTP"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
