import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT
        p.id,
        p.serial_number,
        p.username,
        p.full_name,
        p.email,
        p.password,
        p.plain_password,
        p.wallet_address,
        p.bep20_address,
        p.account_balance,
        p.bonus_balance,
        p.total_earnings,
        p.total_referrals,
        p.referral_count,
        p.referral_earnings,
        p.referral_code,
        p.referred_by,
        p.status,
        p.is_active,
        p.activation_fee_paid,
        p.activation_date,
        p.activation_deadline,
        p.is_frozen,
        p.account_frozen,
        p.created_at,
        p.updated_at,
        p.rank,
        p.details_completed,
        p.country,
        p.state,
        p.pin_code,
        p.full_address,
        p.mobile_number,
        p.country_code,
        p.last_login,
        p.last_seen,
        p.account_type,
        p.whatsapp_otp,
        p.otp_verified,
        p.otp_verified_at,
        sess.last_session_login,
        sess.last_session_activity,
        sess.last_ip_address,
        sess.total_active_seconds
       FROM participants p
       LEFT JOIN LATERAL (
         SELECT
           MAX(ps.created_at) AS last_session_login,
           MAX(ps.last_activity) AS last_session_activity,
           (ARRAY_AGG(ps.ip_address ORDER BY ps.last_activity DESC NULLS LAST, ps.created_at DESC))[1] AS last_ip_address,
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ps.last_activity, ps.created_at) - ps.created_at))), 0)::bigint AS total_active_seconds
         FROM participant_sessions ps
         WHERE ps.participant_id = p.id
       ) sess ON TRUE
       WHERE p.is_deleted IS NOT TRUE
       ORDER BY p.created_at DESC`
    )

    const participants = rows.map((p: any) => {
      const lastLoginTime = p.last_session_login || p.last_login || null
      const lastActiveTime = p.last_session_activity || p.last_seen || null

      return {
        id: p.id,
        serial_number: p.serial_number || p.id?.toString().slice(-6) || "",
        wallet_address: p.wallet_address || p.bep20_address || "",
        bep20_address: p.bep20_address || p.wallet_address || "",
        email: p.email || "",
        plain_password: p.plain_password || p.password || "",
        name: p.full_name || p.username || "Participant",
        full_name: p.full_name || "",
        username: p.username || "",
        mobile_number: p.mobile_number || "",
        phone: p.mobile_number || "",
        country_code: p.country_code || "",
        country: p.country || "Not specified",
        state: p.state || "",
        pin_code: p.pin_code || "",
        full_address: p.full_address || "",
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at,
        last_login: lastLoginTime,
        last_active: lastActiveTime,
        last_seen: lastActiveTime,
        ip_address: p.last_ip_address || null,
        total_active_seconds: Number(p.total_active_seconds || 0),
        account_type: p.account_type || null,
        funded_amount: p.account_balance == null ? null : Number(p.account_balance),
        funded_initial_balance: null,
        funded_breach_status: null,
        funded_breach_at: null,
        funded_breach_balance: null,
        funded_breach_equity: null,
        account_frozen: Boolean(p.account_frozen || p.is_frozen),
        is_frozen: Boolean(p.is_frozen || p.account_frozen),
        status: p.status || "pending",
        rank: p.rank || null,
        is_active: p.is_active === true,
        wallet_balance: p.account_balance == null ? null : Number(p.account_balance),
        account_balance: p.account_balance == null ? null : Number(p.account_balance),
        bonus_balance: p.bonus_balance == null ? null : Number(p.bonus_balance),
        total_earnings: p.total_earnings == null ? null : Number(p.total_earnings),
        referral_code: p.referral_code || "",
        referred_by: p.referred_by || "",
        referral_count: p.referral_count || p.total_referrals || 0,
        referral_earnings: Number(p.referral_earnings) || 0,
        total_referrals: p.total_referrals || p.referral_count || 0,
        whatsapp_otp: p.whatsapp_otp || "",
        otp_verified: Boolean(p.otp_verified),
        otp_verified_at: p.otp_verified_at || null,
        activation_fee_paid: Boolean(p.activation_fee_paid || p.activation_date),
        activation_fee_paid_at: p.activation_date || null,
        activation_deadline: p.activation_deadline || null,
      }
    })

    return NextResponse.json({ participants, total: participants.length })
  } catch (error) {
    console.error("[v0] Error in participants API:", error)
    return NextResponse.json(
      { error: "Failed to fetch participants", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
