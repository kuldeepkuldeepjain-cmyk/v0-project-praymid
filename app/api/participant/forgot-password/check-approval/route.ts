import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP required" },
        { status: 400 }
      )
    }

    // Check if OTP has been approved by admin
    const otpRecord = await query(
      `SELECT * FROM mobile_verification_otps 
       WHERE otp = $1 
       AND verified = true 
       AND purpose = 'password_reset'
       AND created_at > NOW() - INTERVAL '10 minutes'`,
      [otp]
    )

    if (otpRecord.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          approved: false,
          message: "OTP not yet approved by admin"
        }
      )
    }

    return NextResponse.json({
      success: true,
      approved: true,
      message: "OTP has been approved"
    })
  } catch (error) {
    console.error("Check approval error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check OTP approval" },
      { status: 500 }
    )
  }
}
