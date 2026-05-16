import { NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"

// One-time migration route — adds password reset OTP columns to participants table
export async function GET(request: NextRequest) {
  try {
    await execute(`ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_reset_otp TEXT`)
    await execute(`ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_reset_otp_verified BOOLEAN DEFAULT false`)
    await execute(`ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_reset_otp_created_at TIMESTAMP`)

    return NextResponse.json({ success: true, message: "Migration complete: password reset OTP columns added." })
  } catch (err: any) {
    console.error("[run-migration]:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
