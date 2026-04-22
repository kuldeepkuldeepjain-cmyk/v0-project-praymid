import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json({ error: "Mobile number and OTP code are required" }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Find valid, unexpired OTP record
    const { data: otpRecord, error: queryError } = await supabase
      .from("mobile_verification_otps")
      .select("*")
      .eq("mobile_number", mobile_number)
      .eq("is_verified", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    if (queryError || !otpRecord) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new OTP." },
        { status: 400 }
      )
    }

    if (otpRecord.otp_code !== otp_code) {
      const newCount = otpRecord.attempt_count + 1
      await supabase
        .from("mobile_verification_otps")
        .update({ attempt_count: newCount })
        .eq("id", otpRecord.id)

      const remaining = 5 - newCount
      if (remaining <= 0) {
        return NextResponse.json(
          { error: "Maximum OTP verification attempts exceeded. Request a new OTP." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: "Incorrect OTP", message: `You have ${remaining} attempts remaining` },
        { status: 400 }
      )
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("mobile_verification_otps")
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id)

    if (updateError) {
      console.error("[verify-otp] Update error:", updateError)
      return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, message: "Mobile number verified successfully", mobile_number },
      { status: 200 }
    )
  } catch (error) {
    console.error("[verify-otp] Error:", error)
    return NextResponse.json({ error: "An error occurred while verifying OTP" }, { status: 500 })
  }
}
