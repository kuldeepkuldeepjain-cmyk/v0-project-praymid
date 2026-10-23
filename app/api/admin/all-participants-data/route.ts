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
        created_at
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
