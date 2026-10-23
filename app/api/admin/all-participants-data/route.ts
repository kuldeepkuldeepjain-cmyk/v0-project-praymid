import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    // Get all participants with their balances and activity
    const participants = await query(
      `SELECT
        p.id,
        p.full_name,
        p.username,
        p.email,
        p.account_balance,
        p.account_type,
        p.status,
        p.is_active,
        p.created_at,
        p.last_login,
        p.last_seen,
        p.country,
        p.state,
        p.pin_code,
        activity.last_ip_address,
        activity.last_session_activity,
        activity.total_active_seconds
       FROM participants p
       LEFT JOIN LATERAL (
         SELECT
           (ARRAY_AGG(ps.ip_address ORDER BY ps.last_activity DESC NULLS LAST, ps.created_at DESC))[1] AS last_ip_address,
           MAX(ps.last_activity) AS last_session_activity,
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ps.last_activity, ps.created_at) - ps.created_at))), 0)::bigint AS total_active_seconds
         FROM participant_sessions ps
         WHERE ps.participant_id = p.id
       ) activity ON TRUE
       WHERE p.is_deleted IS NOT TRUE
       ORDER BY p.created_at DESC
       LIMIT 1000`
    )

    const stats = await query(`SELECT COUNT(*) as total_participants, COALESCE(SUM(account_balance), 0) as total_balance, COUNT(*) FILTER (WHERE is_active = true) as active_participants FROM participants WHERE is_deleted IS NOT TRUE`)

    return NextResponse.json(
      {
        success: true,
        data: {
          participants: participants.map((p: any) => ({
            ...p,
            last_login: p.last_login || null,
            last_seen_at: p.last_session_activity || p.last_seen || null,
            active_in_at: p.last_session_activity || p.last_seen || null,
            last_ip_address: p.last_ip_address || null,
            total_active_seconds: Number(p.total_active_seconds || 0),
            account_balance: parseFloat(p.account_balance || 0),
          })),
          statusStats: [],
          stats: stats[0] ? {
            total_participants: parseInt(stats[0].total_participants),
            total_balance: parseFloat(stats[0].total_balance || 0),
            active_participants: parseInt(stats[0].active_participants),
          } : {},
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] All participants error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch participants" },
      { status: 500 }
    )
  }
}
