import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    const emailKey = String(email || "").trim().toLowerCase()
    const codeKey = String(code || "").trim()
    if (!emailKey || !/^\d{6}$/.test(codeKey)) {
      return NextResponse.json({ success: false, message: "Enter the 6-digit verification code." }, { status: 400 })
    }

    const pending = await query<any>(`SELECT registration_data FROM registration_email_verifications WHERE LOWER(email) = $1 AND verification_code = $2 AND expires_at > NOW() LIMIT 1`, [emailKey, codeKey])
    if (!pending.length) return NextResponse.json({ success: false, message: "Invalid or expired verification code. Request a new code and try again." }, { status: 400 })
    const data = pending[0].registration_data
    const created = await query<any>(`INSERT INTO participants (full_name, username, email, password_hash, plain_password, wallet_address, referral_code, referred_by, account_type, account_balance, status, is_active, whatsapp_otp, otp_verified, mobile_number, is_deleted) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,'active',true,NULL,true,$10,false) RETURNING id`, [data.fullName, data.username, data.email, data.password, data.password, data.walletAddress, data.newReferralCode, data.referralCode, data.normalizedAccountType, data.mobileNumber])
    if (!created.length) return NextResponse.json({ success: false, message: "Unable to create your account. Please try again." }, { status: 500 })
    if (data.referralCode) await query(`UPDATE participants SET referral_count = COALESCE(referral_count, 0) + 1, total_referrals = COALESCE(total_referrals, 0) + 1 WHERE referral_code = $1`, [data.referralCode])
    await query("DELETE FROM registration_email_verifications WHERE email = $1", [emailKey])
    return NextResponse.json({ success: true, participantId: created[0].id, message: "Email verified. Your account is ready to use." })
  } catch (error) {
    console.error("[v0] Email verification failed:", error)
    return NextResponse.json({ success: false, message: "Verification is temporarily unavailable. Please try again." }, { status: 500 })
  }
}
