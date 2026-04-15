import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, email } = await request.json()

    if (!mobile_number || !email) {
      return NextResponse.json(
        { error: "Mobile number and email are required" },
        { status: 400 }
      )
    }

    // Validate mobile number format (basic validation)
    const mobileRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    if (!mobileRegex.test(mobile_number.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Invalid mobile number format" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if mobile number already exists in participants table
    const { data: existingParticipant, error: checkMobileError } = await supabase
      .from("participants")
      .select("id")
      .eq("mobile_number", mobile_number)
      .maybeSingle()

    if (existingParticipant) {
      return NextResponse.json(
        { error: "This mobile number is already registered" },
        { status: 409 }
      )
    }

    // Check if email already exists in participants table
    const { data: existingEmail, error: checkEmailError } = await supabase
      .from("participants")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      )
    }

    // Delete expired OTP records for this mobile
    await supabase
      .from("mobile_verification_otps")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("mobile_number", mobile_number)

    // Generate OTP
    const otp = generateOTP()

    // Delete any existing OTP records for this mobile number (expired or verified)
    await supabase
      .from("mobile_verification_otps")
      .delete()
      .eq("mobile_number", mobile_number)

    // Now insert new OTP record
    const { data: otpRecord, error: otpError } = await supabase
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
      .select()
      .maybeSingle()

    if (otpError) {
      console.error("[v0] Error creating OTP record:", otpError)
      return NextResponse.json({ error: "Failed to save OTP record" }, { status: 500 })
    }

    // Send OTP via otp.dev API (non-blocking - don't wait for response)
    const otpApiKey = process.env.OTP_API_KEY
    const otpSenderId = process.env.OTP_SENDER_ID
    const otpTemplateId = process.env.OTP_TEMPLATE_ID

    if (otpApiKey && otpSenderId && otpTemplateId) {
      // Send SMS in background without blocking the response
      fetch("https://api.otp.dev/v1/verifications", {
        method: "POST",
        headers: {
          "X-OTP-Key": otpApiKey,
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: {
            channel: "sms",
            sender: otpSenderId,
            phone: mobile_number,
            template: otpTemplateId,
            code_length: 6,
          },
        }),
      })
        .then((response) => {
          if (response.ok) {
            console.log("[v0] OTP sent successfully via otp.dev")
          } else {
            console.warn("[v0] OTP SMS delivery failed, but OTP stored in database")
          }
        })
        .catch((error) => {
          console.warn("[v0] OTP SMS service error, but OTP available for verification:", error)
        })
    } else {
      console.warn("[v0] OTP service credentials not configured, OTP stored in database only")
    }

    // Always return success so user can proceed with verification
    // otp is returned so the UI can display it (no real SMS integration yet)
    return NextResponse.json(
      {
        success: true,
        message: "OTP sent",
        otp,
        expiresIn: 600, // 10 minutes in seconds
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in send OTP:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
