import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { getPool } from "@/lib/db"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

function generateWallet(): string {
  return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
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
    const walletAddress = generateWallet()
    const newReferralCode = generateReferralCode(username)
    const hashedPassword = await bcrypt.hash(password, 10)

    const db = getPool()!

    // Check duplicates
    const emailCheck = await db.query("SELECT id FROM participants WHERE email = $1 LIMIT 1", [emailKey])
    if (emailCheck.rows.length > 0) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })

    const phoneCheck = await db.query("SELECT id FROM participants WHERE mobile_number = $1 LIMIT 1", [mobileNumber])
    if (phoneCheck.rows.length > 0) return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })

    const usernameCheck = await db.query("SELECT id FROM participants WHERE username = $1 LIMIT 1", [usernameKey])
    if (usernameCheck.rows.length > 0) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })

    if (referralCode) {
      const refCheck = await db.query("SELECT id FROM participants WHERE referral_code = $1 LIMIT 1", [referralCode.toUpperCase()])
      if (refCheck.rows.length === 0) return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
    }

    const insertResult = await db.query(
      `INSERT INTO participants
        (full_name, username, email, mobile_number, password, plain_password, wallet_address,
         country, country_code, state, pin_code, status, rank, referral_code, referred_by,
         total_referrals, total_earnings, account_balance, bonus_balance, is_active,
         whatsapp_otp, otp_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active','bronze',$12,$13,0,0,0,0,true,$14,false)
       RETURNING *`,
      [
        fullName, usernameKey, emailKey, mobileNumber, hashedPassword, password, walletAddress,
        country || "", countryCode || "", state || "", pinCode || "",
        newReferralCode, referralCode ? referralCode.toUpperCase() : null,
        whatsappOtp || null,
      ]
    )

    const newParticipant = insertResult.rows[0]

    // Update referrer count
    if (referralCode) {
      await db.query(
        "UPDATE participants SET total_referrals = total_referrals + 1 WHERE referral_code = $1",
        [referralCode.toUpperCase()]
      ).catch(() => {})
    }

    try { await setParticipantSession({ participantId: newParticipant.id, email: newParticipant.email, role: "participant" }) } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Registration successful",
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
