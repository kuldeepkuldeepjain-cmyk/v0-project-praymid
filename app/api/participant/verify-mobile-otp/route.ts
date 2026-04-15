import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json(
        { error: "Mobile number and OTP code are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find OTP record
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

    // Check if OTP code matches
    const isCorrectOTP = otpRecord.otp_code === otp_code

    if (!isCorrectOTP) {
      // Increment attempt count
      await supabase
        .from("mobile_verification_otps")
        .update({ attempt_count: otpRecord.attempt_count + 1 })
        .eq("id", otpRecord.id)

      const remainingAttempts = 5 - (otpRecord.attempt_count + 1)
      if (remainingAttempts <= 0) {
        return NextResponse.json(
          {
            error: "Maximum OTP verification attempts exceeded. Request a new OTP.",
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          error: "Incorrect OTP",
          message: `You have ${remainingAttempts} attempts remaining`,
        },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("mobile_verification_otps")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", otpRecord.id)

    if (updateError) {
      console.error("Error updating OTP record:", updateError)
      return NextResponse.json(
        { error: "Failed to verify OTP" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Mobile number verified successfully",
        mobile_number,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json(
      { error: "An error occurred while verifying OTP" },
      { status: 500 }
    )
  }
}
