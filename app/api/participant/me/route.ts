import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const rows = await sql`SELECT * FROM participants WHERE email = ${email} LIMIT 1`
    const participant = rows[0]

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        email: participant.email,
        username: participant.username,
        full_name: participant.full_name,
        serial_number: participant.serial_number,
        referral_code: participant.referral_code,
        referred_by: participant.referred_by,
        account_balance: Number(participant.account_balance) || 0,
        bonus_balance: Number(participant.bonus_balance) || 0,
        total_earnings: Number(participant.total_earnings) || 0,
        total_referrals: participant.total_referrals || 0,
        wallet_address: participant.wallet_address,
        bep20_address: participant.wallet_address,
        is_active: participant.is_active,
        status: participant.status,
        rank: participant.rank,
        activation_date: participant.activation_date,
        created_at: participant.created_at,
        country: participant.country,
        state: participant.state,
        pin_code: participant.pin_code,
        full_address: participant.full_address,
        mobile_number: participant.mobile_number,
        details_completed: participant.details_completed,
        referral_earnings: Number(participant.bonus_balance) || 0,
        wallet_balance: Number(participant.account_balance) || 0,
      },
    })
  } catch (error) {
    console.error("/api/participant/me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
