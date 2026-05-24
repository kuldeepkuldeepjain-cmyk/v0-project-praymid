import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode, whatsappOtp } = await request.json()

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, error: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const emailKey = email.toLowerCase().trim()
    const usernameKey = username.toLowerCase().trim()
    const mobileNumberClean = mobileNumber?.toString().trim() || null
    const walletAddress = null // No demo wallet — user must enter their own BEP20 address
    const newReferralCode = generateReferralCode(username)
    // Check duplicates
    const emailRows = await query("SELECT id FROM participants WHERE email = $1 LIMIT 1", [emailKey])
    if (emailRows.length > 0) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })

    const usernameRows = await query("SELECT id FROM participants WHERE username = $1 LIMIT 1", [usernameKey])
    if (usernameRows.length > 0) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })

    if (referralCode) {
      const refRows = await query("SELECT id FROM participants WHERE referral_code = $1 LIMIT 1", [referralCode.toUpperCase()])
      if (refRows.length === 0) return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
    }

    // Helper to increment referrer counts after insert
    const incrementReferrerCounts = async (code: string) => {
      await query(
        `UPDATE participants SET total_referrals = COALESCE(total_referrals, 0) + 1 WHERE referral_code = $1`,
        [code]
      ).catch(() => {})
    }

    const inserted = await query<Record<string, any>>(
      `INSERT INTO participants
        (full_name, username, email, password_hash, wallet_address,
         referral_code, referred_by, account_balance, status, is_active,
         whatsapp_otp, otp_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,'pending',false,$8,false)
       RETURNING *`,
      [
        fullName, usernameKey, emailKey, password.trim(), walletAddress,
        newReferralCode, referralCode ? referralCode.toUpperCase() : null,
        whatsappOtp || null,
      ]
    )

    const newParticipant = inserted[0]

    // Increment referrer's referral count if a valid referral code was used
    if (referralCode) {
      await incrementReferrerCounts(referralCode.toUpperCase())
    }

    // Do NOT auto-login — participant must wait for admin to verify mobile OTP first

    return NextResponse.json({
      success: true,
      pendingVerification: true,
      message: "Registration successful! Please wait for admin to verify your mobile OTP before logging in.",
      participantId: newParticipant.id,
      walletAddress,
      username: usernameKey,
      email: emailKey,
      name: fullName,
      full_name: fullName,
      referralCode: newReferralCode,
      referral_code: newReferralCode,
      bep20_address: walletAddress,
      wallet_balance: 0,
      account_balance: 0,
      bonus_balance: 0,
      total_referrals: 0,
      total_earnings: 0,
      status: "active",
      rank: "bronze",
      is_active: true,
      details_completed: false,
      serial_number: newParticipant.serial_number || "",
      created_at: newParticipant.created_at,
    })
  } catch (error: any) {
    console.error("[register] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Registration failed" }, { status: 500 })
  }
}
