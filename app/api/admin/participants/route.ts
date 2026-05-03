import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const participants = await sql`
      SELECT * FROM participants ORDER BY created_at DESC
    `

    const formatted = participants.map((p: any) => ({
      id: p.id,
      serial_number: p.serial_number || "",
      wallet_address: p.wallet_address || p.bep20_address || "",
      email: p.email,
      name: p.full_name || p.username || "Unknown",
      full_name: p.full_name || "",
      username: p.username || "",
      mobile_number: p.mobile_number || "",
      country_code: p.country_code || "",
      full_address: p.full_address || "",
      state: p.state || "",
      country: p.country || "",
      pin_code: p.pin_code || "",
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_login: p.last_login || p.created_at,
      status: p.status || "active",
      is_active: p.is_active !== false,
      wallet_balance: Number(p.account_balance) || 0,
      account_balance: Number(p.account_balance) || 0,
      bonus_balance: Number(p.bonus_balance) || 0,
      total_earnings: Number(p.total_earnings) || 0,
      total_referrals: p.total_referrals || 0,
      referral_code: p.referral_code || "",
      referred_by: p.referred_by || "",
      rank: p.rank || "bronze",
      details_completed: p.details_completed || false,
      activation_date: p.activation_date || null,
      plain_password: p.plain_password || "",
    }))

    return NextResponse.json({ participants: formatted, total: formatted.length })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch participants", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
