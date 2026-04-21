import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import twilio from "twilio"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getPool() {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL is not configured")
  // Strip sslmode from the connection string so pg uses our explicit ssl config
  const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "")
  return new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

export async function POST(request: NextRequest) {
  const pool = getPool()
  try {
    const { mobile_number, email } = await request.json()

    if (!mobile_number || !email) {
      return NextResponse.json({ error: "Mobile number and email are required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check duplicates
    const mobileCheck = await pool.query(
      "SELECT id FROM participants WHERE mobile_number = $1 LIMIT 1",
      [mobile_number]
    )
    if (mobileCheck.rows.length > 0) {
      return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })
    }

    const emailCheck = await pool.query(
      "SELECT id FROM participants WHERE email = $1 LIMIT 1",
      [email]
    )
    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 })
    }

    // Clean up old OTPs for this number
    await pool.query(
      "DELETE FROM mobile_verification_otps WHERE mobile_number = $1",
      [mobile_number]
    )

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await pool.query(
      `INSERT INTO mobile_verification_otps
        (mobile_number, otp_code, email, is_verified, attempt_count, created_at, expires_at)
       VALUES ($1, $2, $3, false, 0, NOW(), $4)`,
      [mobile_number, otp, email, expiresAt]
    )

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
  } finally {
    await pool.end()
  }
}
