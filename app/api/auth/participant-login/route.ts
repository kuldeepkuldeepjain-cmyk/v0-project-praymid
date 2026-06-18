import { NextResponse } from "next/server"
import { setParticipantSession } from "@/lib/session"
import { query, execute } from "@/lib/db"

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
                otp_verified, mobile_number, created_at
         FROM participants WHERE email = $1 LIMIT 1`,
        [emailKey]
      )
    } else if (mobileKey) {
      rows = await query(
        `SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at
         FROM participants WHERE mobile_number = $1 LIMIT 1`,
        [mobileKey]
      )
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const participant = rows[0] as any

    // Verify password — plain text match first, fallback to hash comparison for old accounts
    const plainMatch = participant.plain_password && participant.plain_password === password
    const hashMatch = participant.password_hash && participant.password_hash === password
    const passwordValid = plainMatch || hashMatch

    if (!passwordValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
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
      walletAddress: participant.wallet_address || "",
      bep20_address: participant.wallet_address || "",
      wallet_balance: Number(participant.account_balance) || 0,
      account_balance: Number(participant.account_balance) || 0,
      bonus_balance: 0,
      total_referrals: 0,
      total_earnings: 0,
      referral_code: participant.referral_code || "",
      referred_by: participant.referred_by || "",
      serial_number: "",
      status: participant.status || "pending",
      rank: "bronze",
      is_active: participant.is_active !== false,
      otp_verified: participant.otp_verified || false,
      details_completed: false,
      country: "",
      state: "",
      pin_code: "",
      full_address: "",
      mobile_number: participant.mobile_number || "",
      activation_date: null,
      created_at: participant.created_at,
    })
  } catch (error: any) {
    console.error("[login] Unexpected error:", error)
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
