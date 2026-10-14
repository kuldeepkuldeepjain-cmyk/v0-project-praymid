import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    // Get all participants with their balances and activity
    const participants = await query(
      `SELECT 
        id,
        full_name,
        username,
        email,
        account_balance,
        account_type,
        status,
        is_active,
        created_at,
        referral_code,
        COALESCE(total_referrals, 0) as total_referrals,
        (SELECT ps.ip_address::text FROM participant_sessions ps WHERE ps.participant_id = participants.id AND ps.ip_address IS NOT NULL ORDER BY ps.last_activity DESC NULLS LAST LIMIT 1) AS last_ip_address,
        (SELECT ps.last_activity FROM participant_sessions ps WHERE ps.participant_id = participants.id ORDER BY ps.last_activity DESC NULLS LAST LIMIT 1) AS last_seen_at
       FROM participants
       ORDER BY created_at DESC
       LIMIT 1000`
    )

    // Get participant count by status
    const statusStats = await query(
      `SELECT status, COUNT(*) as count 
       FROM participants 
       GROUP BY status`
    )

    // Get total statistics
    const stats = await query(
      `SELECT 
        COUNT(*) as total_participants,
        SUM(account_balance) as total_balance,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_participants
       FROM participants`
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          participants: participants.map((p: any) => ({
            ...p,
            account_balance: parseFloat(p.account_balance || 0),
          })),
          statusStats,
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
