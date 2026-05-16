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

    // Fetch password reset OTPs — correct column names: otp_code, is_verified
    const passwordResetOtps = await query(
      `SELECT mvo.id, mvo.otp_code as whatsapp_otp, mvo.is_verified as otp_verified,
              mvo.created_at, 'password_reset' as otp_type,
              mvo.mobile_number, mvo.email,
              p.full_name, p.username
       FROM mobile_verification_otps mvo
       LEFT JOIN participants p ON LOWER(p.email) = LOWER(mvo.email)
       WHERE mvo.is_verified = false
         AND mvo.purpose = 'password_reset'
         AND mvo.expires_at > NOW()
       ORDER BY mvo.created_at DESC`
    )

    const allOtps = [...registrationOtps, ...passwordResetOtps].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ success: true, pending: allOtps, count: allOtps.length })
  } catch (error: any) {
    console.error("[pending-otp-approvals] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed" }, { status: 500 })
  }
}
