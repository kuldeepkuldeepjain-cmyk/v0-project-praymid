import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, serial_number, username, full_name, email,
              wallet_address, account_balance, is_active, created_at
       FROM participants
       ORDER BY created_at DESC`
    )

    const participants = rows.map((p: any) => ({
      id: p.id,
      serial_number: p.serial_number || p.id?.toString().slice(-6) || "",
      wallet_address: p.wallet_address || "",
      bep20_address: "",
      email: p.email,
      plain_password: "",
      name: p.full_name || p.username || "Unknown",
      full_name: p.full_name || "",
      username: p.username || "",
      mobile_number: "",
      phone: "",
      country_code: "",
      country: "",
      state: "",
      pin_code: "",
      full_address: "",
      created_at: p.created_at,
      updated_at: p.created_at,
      last_login: null,
      last_active: null,
      last_seen: null,
      ip_address: null,
      total_active_seconds: 0,
      account_type: p.account_type || "normal",
      funded_amount: Number(p.funded_amount) || 0,
      funded_initial_balance: Number(p.funded_initial_balance) || 0,
      funded_breach_status: p.funded_breach_status || "clear",
      funded_breach_at: p.funded_breach_at || null,
      funded_breach_balance: Number(p.funded_breach_balance) || 0,
      funded_breach_equity: Number(p.funded_breach_equity) || 0,
      account_frozen: Boolean(p.account_frozen),
      is_frozen: Boolean(p.is_frozen),
      status: p.status || "active",
      rank: p.rank || "",
      is_active: p.is_active !== false,
      wallet_balance: Number(p.account_balance) || 0,
      account_balance: Number(p.account_balance) || 0,
      bonus_balance: Number(p.bonus_balance) || 0,
      total_earnings: Number(p.total_earnings) || 0,
      referral_code: p.referral_code || "",
      referred_by: p.referred_by || "",
      referral_count: p.referral_count || 0,
      referral_earnings: Number(p.referral_earnings) || 0,
      total_referrals: p.total_referrals || 0,
      whatsapp_otp: p.whatsapp_otp || "",
      otp_verified: p.otp_verified || false,
      otp_verified_at: p.otp_verified_at || null,
      activation_fee_paid: !!p.activation_date,
      activation_fee_paid_at: p.activation_date || null,
      activation_deadline: p.activation_deadline || null,
    }))

    return NextResponse.json({ participants, total: participants.length })
  } catch (error) {
    console.error("[v0] Error in participants API:", error)
    return NextResponse.json(
      { error: "Failed to fetch participants", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
