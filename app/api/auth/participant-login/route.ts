import { NextResponse } from "next/server"
import { setParticipantSession } from "@/lib/session"
import { query, execute } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password, mobile_number } = await request.json()

    if (!password) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 })
    }

    if (!email && !mobile_number) {
      return NextResponse.json({ success: false, error: "Email or mobile number is required" }, { status: 400 })
    }

    let emailKey = email ? email.toLowerCase().trim() : null
    let mobileKey = mobile_number ? mobile_number.toString().trim() : null

    // Query participant by email or mobile number
    let rows = []
    if (emailKey) {
      rows = await query(
        `SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                country, state, pin_code, full_address, details_completed, bep20_address
         FROM participants WHERE email = $1 LIMIT 1`,
        [emailKey]
      )
    } else if (mobileKey) {
      rows = await query(
        `SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                country, state, pin_code, full_address, details_completed, bep20_address
         FROM participants WHERE mobile_number = $1 LIMIT 1`,
        [mobileKey]
      )
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const participant = rows[0] as any

    // Verify password — support bcrypt hashes AND plain text (legacy accounts)
    let passwordValid = false
    const hash = participant.password_hash || ""
    const isBcrypt = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")

    if (isBcrypt) {
      // Properly hashed password — use bcrypt compare
      passwordValid = await bcrypt.compare(password, hash)
    } else {
      // Legacy plain-text stored password
      passwordValid = hash === password || (participant.plain_password && participant.plain_password === password)
    }

    if (!passwordValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Opportunistically re-hash plain text passwords to bcrypt on successful login
    if (!isBcrypt) {
      const newHash = await bcrypt.hash(password, 12)
      await execute("UPDATE participants SET password_hash = $1, plain_password = $2 WHERE id = $3", [newHash, password, participant.id]).catch(() => {})
    }

    // Block login if mobile OTP not yet verified by admin
    if (participant.otp_verified === false) {
      return NextResponse.json({
        success: false,
        error: "Your account is pending admin verification. Please wait for admin to verify your mobile OTP before logging in.",
        pendingVerification: true,
      }, { status: 403 })
    }

    // Update last login (best-effort, column may not exist)
    await execute("UPDATE participants SET updated_at = NOW() WHERE id = $1", [participant.id]).catch(() => {})

    await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant" })

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      email: participant.email,
      username: participant.username || participant.email.split("@")[0],
      name: participant.full_name || participant.username || "",
      full_name: participant.full_name || "",
      walletAddress: participant.wallet_address || participant.bep20_address || "",
      bep20_address: participant.bep20_address || participant.wallet_address || "",
      wallet_balance: Number(participant.account_balance) || 0,
      account_balance: Number(participant.account_balance) || 0,
      bonus_balance: Number(participant.bonus_balance) || 0,
      total_referrals: Number(participant.total_referrals) || 0,
      total_earnings: Number(participant.total_earnings) || 0,
      referral_earnings: Number(participant.referral_earnings) || 0,
      referral_code: participant.referral_code || "",
      referred_by: participant.referred_by || "",
      serial_number: participant.serial_number || "",
      status: participant.status || "pending",
      rank: participant.rank || "bronze",
      is_active: participant.is_active !== false,
      otp_verified: participant.otp_verified || false,
      details_completed: participant.details_completed || false,
      country: participant.country || "",
      state: participant.state || "",
      pin_code: participant.pin_code || "",
      full_address: participant.full_address || "",
      mobile_number: participant.mobile_number || "",
      activation_date: null,
      created_at: participant.created_at,
    })
  } catch (error: any) {
    console.error("[login] Unexpected error:", error?.message, error?.code, error?.detail)
    return NextResponse.json({
      success: false,
      error: "Login failed",
      detail: process.env.NODE_ENV !== "production" ? error?.message : undefined,
      _debug: error?.message?.slice(0, 120),
    }, { status: 500 })
  }
}
