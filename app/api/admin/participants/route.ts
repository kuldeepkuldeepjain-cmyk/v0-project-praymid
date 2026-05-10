import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, email, username, full_name, plain_password,
              wallet_address, account_balance, is_active, status, referral_code, referred_by,
              whatsapp_otp, otp_verified, otp_verified_at, created_at, updated_at, rank,
              serial_number, mobile_number, country_code, country, state, pin_code, full_address,
              bep20_address, total_earnings, bonus_balance, referral_count, referral_earnings,
              is_deleted, deleted_at, last_login, total_referrals
       FROM participants WHERE is_deleted = FALSE ORDER BY created_at DESC`
    )

    const participants = rows.map((p: any) => ({
      id: p.id,
      serial_number: p.serial_number || p.id?.toString().slice(-6) || "",
      wallet_address: p.wallet_address || "",
      bep20_address: p.bep20_address || "",
      email: p.email,
      plain_password: p.plain_password || "",
      name: p.full_name || p.username || "Unknown",
      full_name: p.full_name || "",
      username: p.username || "",
      mobile_number: p.mobile_number || "",
      country_code: p.country_code || "",
      country: p.country || "",
      state: p.state || "",
      pin_code: p.pin_code || "",
      full_address: p.full_address || "",
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_login: p.last_login,
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
