import { NextResponse } from "next/server"
import { query, withTransaction } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    const emailKey = String(email || "").trim().toLowerCase()
    const codeKey = String(code || "").trim()
    if (!emailKey || !/^\d{6}$/.test(codeKey)) {
      return NextResponse.json({ success: false, message: "Enter the 6-digit verification code." }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const pending = await client.query<any>(`SELECT id, registration_data FROM registration_email_verifications WHERE LOWER(email) = $1 AND verification_code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [emailKey, codeKey])
      if (!pending.rows.length) return { error: "Invalid or expired verification code. Request a new code and try again." }
      const data = pending.rows[0].registration_data
      const created = await client.query<any>(`INSERT INTO participants (full_name, username, email, password_hash, plain_password, wallet_address, referral_code, referred_by, account_type, account_balance, status, is_active, whatsapp_otp, otp_verified, mobile_number, is_deleted, challenge_plan_key, challenge_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,'active',true,NULL,true,$10,false,$11,'not_started') RETURNING id`, [data.fullName, data.username, data.email, data.password, data.password, data.walletAddress, data.newReferralCode, data.referralCode, data.normalizedAccountType, data.mobileNumber, data.challengePlanKey || null])
      if (!created.rows.length) throw new Error("Unable to create your account. Please try again.")
      if (data.referralCode) await client.query(`UPDATE participants SET referral_count = COALESCE(referral_count, 0) + 1, total_referrals = COALESCE(total_referrals, 0) + 1 WHERE referral_code = $1`, [data.referralCode])
      await client.query(`DELETE FROM registration_email_verifications WHERE id = $1`, [pending.rows[0].id])
      return { participantId: created.rows[0].id }
    })
    if ("error" in result) return NextResponse.json({ success: false, message: result.error }, { status: 400 })
    return NextResponse.json({ success: true, participantId: result.participantId, message: "Email verified. Your account is ready to use." })
  } catch (error) {
    console.error("[v0] Email verification failed:", error)
    return NextResponse.json({ success: false, message: "Verification is temporarily unavailable. Please try again." }, { status: 500 })
  }
}
