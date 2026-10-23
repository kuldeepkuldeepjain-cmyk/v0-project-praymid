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
        id,
        full_name,
        username,
        email,
        account_balance,
        is_active,
        created_at,
        (SELECT MAX(ps.created_at) FROM participant_sessions ps WHERE ps.participant_id = participants.id) AS session_last_login,
        (SELECT MAX(ps.last_activity) FROM participant_sessions ps WHERE ps.participant_id = participants.id) AS session_last_active,
        (SELECT ps.ip_address::text FROM participant_sessions ps WHERE ps.participant_id = participants.id AND ps.ip_address IS NOT NULL ORDER BY ps.last_activity DESC NULLS LAST LIMIT 1) AS session_ip_address,
        COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(ps.last_activity, ps.created_at) - ps.created_at))::bigint) FROM participant_sessions ps WHERE ps.participant_id = participants.id), 0) AS total_active_seconds
       FROM participants
       ORDER BY created_at DESC
       LIMIT 1000`
    )

    const stats = await query(`SELECT COUNT(*) as total_participants, COALESCE(SUM(account_balance), 0) as total_balance, COUNT(*) FILTER (WHERE is_active = true) as active_participants FROM participants`)

    return NextResponse.json(
      {
        success: true,
        data: {
          participants: participants.map((p: any) => ({
            ...p,
            last_login: p.session_last_login || null,
            last_seen_at: p.session_last_active || null,
            active_in_at: p.session_last_active || null,
            last_ip_address: p.session_ip_address || null,
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
