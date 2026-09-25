import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email) return NextResponse.json({ success: false, error: "Participant email is required." }, { status: 400 })

  const db = getPool()
  if (!db) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 })
  const client = await db.connect()

  try {
    await client.query("BEGIN")
    const result = await client.query(
      `UPDATE forex_trades
       SET status = 'closed', close_price = open_price, final_pnl = 0, final_pips = 0, final_swap = COALESCE(swap, 0),
           close_reason = 'manual', close_time = NOW()::text, close_duration = 'admin force close', updated_at = NOW()
       WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'
       RETURNING id, pair, direction, lot_size`,
      [email],
    )
    await client.query(
      "INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1, 'admin_force_close_trades', 'forex_trade', $2)",
      [auth.email, `Force-closed ${result.rowCount || 0} running trade(s) for ${email}`],
    )
    await client.query("COMMIT")
    return NextResponse.json({ success: true, closedCount: result.rowCount || 0, trades: result.rows })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[v0] Admin force-close trades failed:", error)
    return NextResponse.json({ success: false, error: "Failed to close running trades." }, { status: 500 })
  } finally {
    client.release()
  }
}
