import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, email, password, username, full_name, wallet_address, account_balance, bonus_balance,
             total_earnings, referral_code, referred_by, serial_number, status, rank, is_active,
             details_completed, country, state, pin_code, full_address, activation_date, created_at,
             is_frozen, mobile_number, total_referrals
      FROM participants
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `

    const participant = rows[0]

    if (!participant) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Support both bcrypt-hashed and legacy plain-text passwords during migration
    let passwordValid = false
    if (participant.password?.startsWith("$2")) {
      passwordValid = await bcrypt.compare(password, participant.password)
    } else {
      passwordValid = participant.password === password
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, 10)
        await sql`UPDATE participants SET password = ${hashed}, plain_password = ${password} WHERE id = ${participant.id}`
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    await sql`UPDATE participants SET last_login = ${new Date().toISOString()} WHERE id = ${participant.id}`

    await setParticipantSession({
      participantId: participant.id,
      email: participant.email,
      role: "participant",
    })

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      walletAddress: participant.wallet_address || "",
      email: participant.email,
      username: participant.username || participant.email.split("@")[0],
      name: participant.full_name || participant.username || "",
      full_name: participant.full_name || "",
      mobile_number: participant.mobile_number || "",
      wallet_balance: Number(participant.account_balance) || 0,
      account_balance: Number(participant.account_balance) || 0,
      bonus_balance: Number(participant.bonus_balance) || 0,
      bep20_address: participant.wallet_address || "",
      total_referrals: participant.total_referrals || 0,
      total_earnings: Number(participant.total_earnings) || 0,
      referral_code: participant.referral_code || "",
      referred_by: participant.referred_by || "",
      serial_number: participant.serial_number || "",
      status: participant.status || "active",
      rank: participant.rank || "bronze",
      is_active: participant.is_active !== false,
      details_completed: participant.details_completed || false,
      country: participant.country || "",
      state: participant.state || "",
      pin_code: participant.pin_code || "",
      full_address: participant.full_address || "",
      activation_date: participant.activation_date || null,
      created_at: participant.created_at,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
