import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json({ error: "Mobile number and OTP code are required" }, { status: 400 })
    }

    // Normalize to E.164 to match what was stored during send
    const normalized = mobile_number.replace(/[\s\-().]/g, "")
    const e164 = normalized.startsWith("+") ? normalized : `+${normalized}`

    // Find the most recent OTP entry for this mobile number in activity_logs
    const rows = await sql`
      SELECT details, created_at
      FROM activity_logs
      WHERE action = 'otp_sent'
        AND target_type = 'mobile_verification'
        AND details->>'mobile_number' = ${e164}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 })
    }

    const { otp, expires } = rows[0].details as { otp: string; expires: string }

    // Check expiry
    if (new Date() > new Date(expires)) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 })
    }

    // Validate OTP
    if (otp_code !== otp) {
      return NextResponse.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 })
    }

    // Clean up used OTP entries for this mobile number
    await sql`
      DELETE FROM activity_logs
      WHERE action = 'otp_sent'
        AND target_type = 'mobile_verification'
        AND details->>'mobile_number' = ${e164}
    `

    return NextResponse.json({ success: true, message: "Mobile number verified successfully", mobile_number: e164 })
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json({ error: "An error occurred while verifying OTP" }, { status: 500 })
  }
}
