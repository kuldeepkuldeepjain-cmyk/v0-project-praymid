import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { Zavudev } from "@zavudev/sdk"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, email } = await request.json()
    if (!mobile_number || !email)
      return NextResponse.json({ error: "Mobile number and email are required" }, { status: 400 })

    // Normalize to E.164: strip spaces, dashes, parens — ensure leading +
    const normalized = mobile_number.replace(/[\s\-().]/g, "")
    const e164 = normalized.startsWith("+") ? normalized : `+${normalized}`
    if (!/^\+[1-9]\d{6,14}$/.test(e164))
      return NextResponse.json({ error: "Invalid mobile number format. Include country code e.g. +923001234567" }, { status: 400 })

    const existingMobile = await sql`SELECT id FROM participants WHERE mobile_number = ${e164} LIMIT 1`
    if (existingMobile.length > 0)
      return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })

    const existingEmail = await sql`SELECT id FROM participants WHERE email = ${email} LIMIT 1`
    if (existingEmail.length > 0)
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 })

    const otp = generateOTP()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store OTP in activity_logs
    await sql`
      INSERT INTO activity_logs (actor_email, action, target_type, details)
      VALUES (${email}, 'otp_sent', 'mobile_verification', ${JSON.stringify({ mobile_number: e164, otp, expires })})
    `

    // Send via Zavu using the integrated credentials
    const zavu = new Zavudev({
      apiKey: process.env.ZAVU_API_KEY!,
      baseURL: process.env.ZAVU_API_URL,
    })
    await zavu.messages.send({
      to: e164,
      text: `Your Praymid verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    })

    return NextResponse.json({ success: true, message: "OTP sent", expiresIn: 600 })
  } catch (error: any) {
    console.error("OTP send error:", error?.message ?? error)
    return NextResponse.json(
      { error: error?.message || "Failed to send OTP. Please try again." },
      { status: 500 }
    )
  }
}
