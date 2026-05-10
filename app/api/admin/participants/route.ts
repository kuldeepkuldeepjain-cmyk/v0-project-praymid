import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, email, username, full_name, mobile_number, plain_password,
              wallet_address, account_balance, is_active, status, referral_code, referred_by,
              whatsapp_otp, otp_verified, otp_verified_at, created_at, updated_at, rank,
              participant_number, phone, country_code, country, state, city, postal_code,
              full_address, address, date_of_birth, gender, occupation, monthly_income,
              details_completed, activation_fee_paid, activation_fee_amount, 
              activation_payment_method, activation_payment_status, participation_count,
              totalContributed, totalPoints, loginStreak, risk_score, ip_address, heard_from, last_active,
              bep20_wallet_address, serial_number
       FROM participants WHERE is_deleted = FALSE ORDER BY created_at DESC`
    )

    const participants = rows.map((p: any) => ({
      id: p.id,
      serial_number: p.serial_number || p.id?.toString().slice(-6) || "",
      participant_number: p.participant_number || "",
      wallet_address: p.wallet_address || p.bep20_wallet_address || "",
      bep20_wallet_address: p.bep20_wallet_address || "",
      email: p.email,
      plain_password: p.plain_password || "",
      name: p.full_name || p.username || "Unknown",
      full_name: p.full_name || "",
      username: p.username || "",
      mobile_number: p.mobile_number || "",
      phone: p.phone || "",
      country_code: p.country_code || "",
      country: p.country || "",
      state: p.state || "",
      city: p.city || "",
      postal_code: p.postal_code || "",
      full_address: p.full_address || p.address || "",
      address: p.address || "",
      date_of_birth: p.date_of_birth || "",
      gender: p.gender || "",
      occupation: p.occupation || "",
      monthly_income: p.monthly_income || "",
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_active: p.last_active,
      status: p.status || "active",
      rank: p.rank || "",
      is_active: p.is_active !== false,
      wallet_balance: Number(p.account_balance) || 0,
      account_balance: Number(p.account_balance) || 0,
      referral_code: p.referral_code || "",
      referred_by: p.referred_by || "",
      whatsapp_otp: p.whatsapp_otp || "",
      otp_verified: p.otp_verified || false,
      otp_verified_at: p.otp_verified_at || null,
      details_completed: p.details_completed || false,
      activation_fee_paid: p.activation_fee_paid || false,
      activation_fee_amount: p.activation_fee_amount || 0,
      activation_payment_method: p.activation_payment_method || "",
      activation_payment_status: p.activation_payment_status || "",
      participation_count: p.participation_count || 0,
      totalContributed: p.totalContributed || 0,
      totalPoints: p.totalPoints || 0,
      loginStreak: p.loginStreak || 0,
      risk_score: p.risk_score || 0,
      ip_address: p.ip_address || "",
      heard_from: p.heard_from || "",
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
