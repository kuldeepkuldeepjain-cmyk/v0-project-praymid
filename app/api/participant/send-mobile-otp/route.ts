import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, email } = await request.json()
    if (!mobile_number || !email) return NextResponse.json({ error: "Mobile number and email are required" }, { status: 400 })

    const mobileRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    if (!mobileRegex.test(mobile_number.replace(/\s/g, ""))) return NextResponse.json({ error: "Invalid mobile number format" }, { status: 400 })

    const existingMobile = await sql`SELECT id FROM participants WHERE mobile_number = ${mobile_number} LIMIT 1`
    if (existingMobile.length > 0) return NextResponse.json({ error: "This mobile number is already registered" }, { status: 409 })

    const existingEmail = await sql`SELECT id FROM participants WHERE email = ${email} LIMIT 1`
    if (existingEmail.length > 0) return NextResponse.json({ error: "This email is already registered" }, { status: 409 })

    const otp = generateOTP()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store OTP in activity_logs as a lightweight approach (no separate OTP table)
    await sql`
      INSERT INTO activity_logs (actor_email, action, target_type, details)
      VALUES (${email}, 'otp_sent', 'mobile_verification', ${JSON.stringify({ mobile_number, otp, expires })})
    `

    return NextResponse.json({ success: true, message: "OTP sent", otp, expiresIn: 600 })
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
