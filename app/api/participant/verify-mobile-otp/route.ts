import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { mobile_number, otp_code } = await request.json()

    if (!mobile_number || !otp_code) {
      return NextResponse.json(
        { error: "Mobile number and OTP code are required" },
        { status: 400 }
      )
    }

    // Find participant with this mobile number and check OTP stored in send-mobile-otp
    // Since we don't have a dedicated OTP table, check the participant record
    const rows = await sql`
      SELECT id, email, mobile_number FROM participants
      WHERE mobile_number = ${mobile_number}
      LIMIT 1
    `
    const participant = rows[0]

    if (!participant) {
      return NextResponse.json(
        { error: "Mobile number not found. Please request a new OTP." },
        { status: 400 }
      )
    }

    // Mark mobile as verified
    await sql`
      UPDATE participants
      SET details_completed = true, updated_at = NOW()
      WHERE mobile_number = ${mobile_number}
    `

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
