import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    // Fetch registration OTPs from participants table
    const registrationOtps = await query(
      `SELECT id, full_name, username, email, mobile_number, whatsapp_otp, otp_verified, created_at, 'registration' as otp_type
       FROM participants
       WHERE (otp_verified = false OR otp_verified IS NULL)
       ORDER BY created_at DESC`
    )

    // Fetch password reset OTPs from participants table
    const passwordResetOtps = await query(
      `SELECT id, full_name, username, email, mobile_number, password_reset_otp as whatsapp_otp, password_reset_otp_verified as otp_verified,
              password_reset_otp_created_at as created_at, 'password_reset' as otp_type
       FROM participants
       WHERE password_reset_otp IS NOT NULL 
       AND password_reset_otp_verified = false
       AND password_reset_otp_created_at > NOW() - INTERVAL '10 minutes'
       ORDER BY password_reset_otp_created_at DESC`
    )

    const allOtps = [...registrationOtps, ...passwordResetOtps].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ success: true, pending: allOtps, count: allOtps.length })
  } catch (error: any) {
    console.error("[pending-otp-approvals] Error:", error.message || error)
    return NextResponse.json({ success: false, error: error.message || "Failed" }, { status: 500 })
  }
}
