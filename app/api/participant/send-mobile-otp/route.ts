import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
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

    const supabase = getAdminClient()

    // Check duplicate mobile
    const { data: existingMobile } = await supabase
      .from("participants")
      .select("id")
      .eq("mobile_number", mobile_number)
      .maybeSingle()

    if (existingMobile) {
      return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })
    }

    // Check duplicate email
    const { data: existingEmail } = await supabase
      .from("participants")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 })
    }

    // Clean up old OTPs for this number
    await supabase
      .from("mobile_verification_otps")
      .delete()
      .eq("mobile_number", mobile_number)

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from("mobile_verification_otps")
      .insert({
        mobile_number,
        otp_code: otp,
        email,
        is_verified: false,
        attempt_count: 0,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error("[send-otp] DB insert error:", insertError)
      return NextResponse.json({ error: "Failed to save OTP record" }, { status: 500 })
    }

    // Send SMS via Zavu API
    const zavuApiKey = process.env.ZAVU_API_KEY
    const zavuApiUrl = process.env.ZAVU_API_URL

    if (!zavuApiKey || !zavuApiUrl) {
      console.error("[send-otp] Zavu credentials missing")
      return NextResponse.json({ error: "SMS service not configured" }, { status: 500 })
    }

    const smsBody = `Your Praymid verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`

    const zavuRes = await fetch(zavuApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${zavuApiKey}`,
      },
      body: JSON.stringify({
        from: "+12024494825",
        to: mobile_number,
        message: smsBody,
      }),
    })

    if (!zavuRes.ok) {
      const errText = await zavuRes.text()
      console.error("[send-otp] Zavu API error:", errText)
      return NextResponse.json({ error: "Failed to send SMS. Please try again." }, { status: 500 })
    }

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
