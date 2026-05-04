import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { participantMemoryStore } from "@/lib/participant-memory-store"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailKey = email.toLowerCase().trim()

    // Try pg DB first
    try {
      const participant = await queryOne(`SELECT * FROM participants WHERE email = $1`, [emailKey])
      if (participant) {
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
      }
    } catch (dbErr) {
      console.error("[me] DB unavailable, checking memory store:", dbErr instanceof Error ? dbErr.message : dbErr)
    }

    // --- Memory store fallback ---
    const mem = participantMemoryStore.get(emailKey)
    if (!mem) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: mem.id, email: mem.email, username: mem.username, full_name: mem.full_name,
        serial_number: "", referral_code: mem.referral_code, referred_by: mem.referred_by,
        account_balance: 0, bonus_balance: 0, total_earnings: 0, total_referrals: 0,
        wallet_address: mem.wallet_address, bep20_address: mem.wallet_address,
        is_active: true, status: "active", rank: "bronze", activation_date: null,
        created_at: mem.created_at, country: mem.country, state: mem.state,
        pin_code: mem.pin_code, full_address: "", mobile_number: mem.mobile_number,
        details_completed: false, referral_earnings: 0, wallet_balance: 0,
      },
    })
  } catch (error) {
    console.error("[me] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
