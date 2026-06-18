import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { otpMemoryStore } from "@/lib/otp-memory-store"

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json({ error: "Mobile number and OTP code are required" }, { status: 400 })
    }

    try {
      const db = getPool()!
      const otpRes = await db.query(
        "SELECT * FROM mobile_verification_otps WHERE mobile_number = $1 AND is_verified = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
        [mobile_number]
      )
      const otpRecord = otpRes.rows[0]

      if (otpRecord) {
        if (otpRecord.otp_code !== otp_code) {
          const newCount = otpRecord.attempt_count + 1
          await db.query("UPDATE mobile_verification_otps SET attempt_count = $1 WHERE id = $2", [newCount, otpRecord.id])
          const remaining = 5 - newCount
          if (remaining <= 0) {
            return NextResponse.json({ error: "Maximum OTP attempts exceeded. Request a new OTP." }, { status: 429 })
          }
          return NextResponse.json({ error: "Incorrect OTP", message: `${remaining} attempts remaining` }, { status: 400 })
        }

        await db.query("UPDATE mobile_verification_otps SET is_verified = true, verified_at = NOW() WHERE id = $1", [otpRecord.id])
        return NextResponse.json({ success: true, message: "Mobile number verified successfully", mobile_number })
      }
    } catch {
      // fall through to memory store
    }

    const memRecord = otpMemoryStore.get(mobile_number)
    if (!memRecord || memRecord.verified || Date.now() > memRecord.expiresAt) {
      return NextResponse.json({ error: "OTP expired or not found. Please request a new OTP." }, { status: 400 })
    }

    if (memRecord.otp !== otp_code) {
      memRecord.attemptCount += 1
      const remaining = 5 - memRecord.attemptCount
      if (remaining <= 0) {
        otpMemoryStore.delete(mobile_number)
        return NextResponse.json({ error: "Maximum OTP attempts exceeded. Request a new OTP." }, { status: 429 })
      }
      return NextResponse.json({ error: "Incorrect OTP", message: `${remaining} attempts remaining` }, { status: 400 })
    }

    memRecord.verified = true
    return NextResponse.json({ success: true, message: "Mobile number verified successfully", mobile_number })
  } catch (error) {
    console.error("[verify-otp] Unexpected error:", error)
    return NextResponse.json({ error: "An error occurred while verifying OTP" }, { status: 500 })
  }
}
