import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { query, execute } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Only select columns that actually exist in the DB schema
    const rows = await query(
      `SELECT id, email, password_hash, username, full_name, wallet_address,
              account_balance, referral_code, referred_by, status, is_active,
              otp_verified, created_at
       FROM participants WHERE email = $1 LIMIT 1`,
      [emailKey]
    )

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    const participant = rows[0] as any

    // Verify password against password_hash
    const passwordValid = participant.password_hash
      ? await bcrypt.compare(password, participant.password_hash)
      : false

    if (!passwordValid) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
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
      mobile_number: "",
      activation_date: null,
      created_at: participant.created_at,
    })
  } catch (error: any) {
    console.error("[login] Unexpected error:", error)
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
