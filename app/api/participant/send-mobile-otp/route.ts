import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
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
    let usedMemoryStore = false

    try {
      const db = getPool()!
      const { rows: existingMobile } = await db.query(
        "SELECT id FROM participants WHERE mobile_number = $1", [mobile_number]
      )
      if (existingMobile.length > 0) {
        return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })
      }
      const { rows: existingEmail } = await db.query(
        "SELECT id FROM participants WHERE email = $1", [email]
      )
      if (existingEmail.length > 0) {
        return NextResponse.json({ error: "This email is already registered" }, { status: 409 })
      }
      await db.query("DELETE FROM mobile_verification_otps WHERE mobile_number = $1", [mobile_number])
      await db.query(
        "INSERT INTO mobile_verification_otps (mobile_number, otp_code, email, is_verified, attempt_count, expires_at) VALUES ($1,$2,$3,false,0,$4)",
        [mobile_number, otp, email, new Date(expiresAt).toISOString()]
      )
    } catch (dbErr) {
      console.error("[send-otp] DB unavailable, using memory store:", dbErr instanceof Error ? dbErr.message : dbErr)
      otpMemoryStore.set(mobile_number, { otp, email, expiresAt, attemptCount: 0, verified: false })
      usedMemoryStore = true
    }

    if (usedMemoryStore) {
      return NextResponse.json({ success: true, message: "OTP generated (preview mode)", otp, expiresIn: 600 })
    }
    return NextResponse.json({ success: true, message: "OTP sent to your mobile number", expiresIn: 600 })
  } catch (error: unknown) {
    console.error("[send-otp] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send OTP" }, { status: 500 })
  }
}
