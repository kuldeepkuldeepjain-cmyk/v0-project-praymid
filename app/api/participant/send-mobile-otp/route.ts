import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { otpMemoryStore } from "@/lib/otp-memory-store"

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

    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000

    // Try Supabase DB first, fall back to in-memory store
    let usedMemoryStore = false
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )

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

      // Clean old OTPs and insert new one
      await supabase.from("mobile_verification_otps").delete().eq("mobile_number", mobile_number)

      const { error: insertError } = await supabase.from("mobile_verification_otps").insert({
        mobile_number,
        otp_code: otp,
        email,
        is_verified: false,
        attempt_count: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      })

      if (insertError) throw new Error(insertError.message)

    } catch (dbErr) {
      console.error("[send-otp] DB unavailable, using memory store:", dbErr instanceof Error ? dbErr.message : dbErr)
      // Store OTP in memory as fallback
      otpMemoryStore.set(mobile_number, { otp, email, expiresAt, attemptCount: 0, verified: false })
      usedMemoryStore = true
    }

    // Try to send SMS via Zavu API
    const zavuApiKey = process.env.ZAVU_API_KEY
    const zavuApiUrl = process.env.ZAVU_API_URL

    if (zavuApiKey && zavuApiUrl) {
      try {
        const zavuRes = await fetch(zavuApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${zavuApiKey}`,
          },
          body: JSON.stringify({
            from: "+12024494825",
            to: mobile_number,
            message: `Your Praymid verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
          }),
        })

        if (!zavuRes.ok) {
          const errText = await zavuRes.text()
          console.error("[send-otp] Zavu API error:", errText)
        }
      } catch (smsErr) {
        console.error("[send-otp] SMS send failed:", smsErr instanceof Error ? smsErr.message : smsErr)
      }
    } else {
      console.warn("[send-otp] Zavu credentials not set")
    }

    // In preview/dev (memory store), return OTP in response so it can be tested
    if (usedMemoryStore) {
      return NextResponse.json({
        success: true,
        message: "OTP generated (preview mode — SMS may not be delivered)",
        otp, // only returned in preview/memory-store mode
        expiresIn: 600,
      }, { status: 200 })
    }

    return NextResponse.json(
      { success: true, message: "OTP sent to your mobile number", expiresIn: 600 },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("[send-otp] Unexpected error:", error)
    const msg = error instanceof Error ? error.message : "Failed to send OTP"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
