import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    // Only select columns that actually exist in the participants table
    const rows = await query(
      `SELECT id, email, username, full_name,
              wallet_address, account_balance, is_active, status,
              referral_code, referred_by, referral_earnings, total_referrals,
              whatsapp_otp, otp_verified, otp_verified_at,
              created_at, updated_at, activation_date, activation_fee_paid,
              location, last_seen
       FROM participants ORDER BY created_at DESC`
    )

    const participants = rows.map((p: any) => ({
      id: p.id,
      serial_number: p.id?.toString().slice(-6) || "",
      wallet_address: p.wallet_address || "",
      email: p.email,
      name: p.full_name || p.username || "Unknown",
      full_name: p.full_name || "",
      username: p.username || "",
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_login: p.last_seen,
      status: p.status || "active",
      is_active: p.is_active !== false,
      wallet_balance: Number(p.account_balance) || 0,
      account_balance: Number(p.account_balance) || 0,
      referral_code: p.referral_code || "",
      referred_by: p.referred_by || "",
      referral_earnings: Number(p.referral_earnings) || 0,
      total_referrals: p.total_referrals || 0,
      whatsapp_otp: p.whatsapp_otp || "",
      otp_verified: p.otp_verified || false,
      otp_verified_at: p.otp_verified_at || null,
      activation_fee_paid: p.activation_fee_paid || !!p.activation_date,
      activation_fee_paid_at: p.activation_date || null,
      location: p.location || "",
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
