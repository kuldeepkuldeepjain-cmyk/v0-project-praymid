import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { otpMemoryStore } from "@/lib/otp-memory-store"

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json({ error: "Mobile number and OTP code are required" }, { status: 400 })
    }

    // Try Supabase DB first
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )

      const { data: otpRecord, error: queryError } = await supabase
        .from("mobile_verification_otps")
        .select("*")
        .eq("mobile_number", mobile_number)
        .eq("is_verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()

      if (!queryError && otpRecord) {
        // Found in DB — verify against it
        if (otpRecord.otp_code !== otp_code) {
          const newCount = otpRecord.attempt_count + 1
          await supabase
            .from("mobile_verification_otps")
            .update({ attempt_count: newCount })
            .eq("id", otpRecord.id)

          const remaining = 5 - newCount
          if (remaining <= 0) {
            return NextResponse.json(
              { error: "Maximum OTP attempts exceeded. Request a new OTP." },
              { status: 429 }
            )
          }
          return NextResponse.json(
            { error: "Incorrect OTP", message: `${remaining} attempts remaining` },
            { status: 400 }
          )
        }

        await supabase
          .from("mobile_verification_otps")
          .update({ is_verified: true, verified_at: new Date().toISOString() })
          .eq("id", otpRecord.id)

        return NextResponse.json(
          { success: true, message: "Mobile number verified successfully", mobile_number },
          { status: 200 }
        )
      }
      // queryError means DB unreachable — fall through to memory store
    } catch {
      // DB unreachable — fall through to memory store
    }

    // Fallback: check in-memory store (used in v0 preview sandbox)
    const memRecord = otpMemoryStore.get(mobile_number)

    if (!memRecord || memRecord.verified || Date.now() > memRecord.expiresAt) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new OTP." },
        { status: 400 }
      )
    }

    if (memRecord.otp !== otp_code) {
      memRecord.attemptCount += 1
      const remaining = 5 - memRecord.attemptCount
      if (remaining <= 0) {
        otpMemoryStore.delete(mobile_number)
        return NextResponse.json(
          { error: "Maximum OTP attempts exceeded. Request a new OTP." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: "Incorrect OTP", message: `${remaining} attempts remaining` },
        { status: 400 }
      )
    }

    // Mark as verified in memory
    memRecord.verified = true

    return NextResponse.json(
      { success: true, message: "Mobile number verified successfully", mobile_number },
      { status: 200 }
    )
  } catch (error) {
    console.error("[verify-otp] Unexpected error:", error)
    return NextResponse.json({ error: "An error occurred while verifying OTP" }, { status: 500 })
  }
}
