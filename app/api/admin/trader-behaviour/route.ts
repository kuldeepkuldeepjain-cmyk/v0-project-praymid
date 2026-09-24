import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

type TraderAnalytics = {
  trader: string
  trades: number
  avgDuration: string
  avgLot: number
  avgRisk: number
  winRate: number
  lossRate: number
  profitFactor: number | null
  avgWin: number
  avgLoss: number
  riskReward: number | null
  tradesPerDay: number
  overtrading: boolean
  maxLosses: number
  maxWins: number
  session: string
  topSymbol: string
  bestDay: string
  worstDay: string
  afterLoss: number
  afterProfit: number
  revengePattern: boolean
  lotEscalation: boolean
}

const empty: TraderAnalytics[] = []

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const rows = await query<any>(`WITH closed AS (
      SELECT participant_email AS trader, pair, lot_size::numeric AS lot_size,
        COALESCE(final_pnl, 0)::numeric AS pnl,
        EXTRACT(EPOCH FROM (COALESCE(close_time::timestamptz, created_at) - open_time::timestamptz)) AS duration_seconds,
        EXTRACT(ISODOW FROM open_time::timestamptz)::int AS day_number,
        EXTRACT(HOUR FROM open_time::timestamptz)::int AS open_hour,
        open_time::timestamptz AS opened_at
      FROM forex_trades
      WHERE status = 'closed' AND open_time IS NOT NULL
        AND COALESCE(close_time::timestamptz, created_at) > NOW() - INTERVAL '90 days'
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY trader ORDER BY opened_at) AS sequence_no,
        LAG(pnl) OVER (PARTITION BY trader ORDER BY opened_at) AS previous_pnl,
        AVG(lot_size) OVER (PARTITION BY trader) AS trader_avg_lot
      FROM closed
    ), summary AS (
      SELECT trader, COUNT(*)::int AS trades, AVG(duration_seconds)::numeric AS avg_duration,
        AVG(lot_size)::numeric AS avg_lot, AVG(ABS(pnl) / NULLIF(lot_size, 0))::numeric AS avg_risk,
        COUNT(*) FILTER (WHERE pnl > 0)::int AS wins, COUNT(*) FILTER (WHERE pnl < 0)::int AS losses,
        SUM(pnl) FILTER (WHERE pnl > 0)::numeric AS gross_profit, SUM(ABS(pnl)) FILTER (WHERE pnl < 0)::numeric AS gross_loss,
        AVG(pnl) FILTER (WHERE pnl > 0)::numeric AS avg_win, AVG(pnl) FILTER (WHERE pnl < 0)::numeric AS avg_loss,
        COUNT(DISTINCT DATE(opened_at))::numeric AS trading_days,
        MODE() WITHIN GROUP (ORDER BY pair) AS top_symbol,
        MODE() WITHIN GROUP (ORDER BY CASE WHEN open_hour BETWEEN 7 AND 11 THEN 'London' WHEN open_hour BETWEEN 12 AND 16 THEN 'New York' WHEN open_hour BETWEEN 0 AND 6 THEN 'Asia' ELSE 'Overlap' END) AS session,
        COUNT(*) FILTER (WHERE previous_pnl < 0 AND lot_size > trader_avg_lot * 1.5)::int AS after_loss,
        COUNT(*) FILTER (WHERE previous_pnl > 0 AND lot_size > trader_avg_lot * 1.5)::int AS after_profit
      FROM ranked GROUP BY trader
    )
    SELECT *, ROUND(avg_duration)::int AS duration_seconds, ROUND(trades / NULLIF(trading_days, 0), 2) AS trades_per_day,
      ROUND((gross_profit / NULLIF(gross_loss, 0))::numeric, 2) AS profit_factor,
      ROUND((avg_win / NULLIF(ABS(avg_loss), 0))::numeric, 2) AS risk_reward
    FROM summary ORDER BY trades DESC LIMIT 100`)

    const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    const analytics = rows.map((row: any): TraderAnalytics => {
      const trades = Number(row.trades)
      const avgLot = Number(row.avg_lot || 0)
      const avgRisk = Number(row.avg_risk || 0)
      const afterLoss = Number(row.after_loss || 0)
      const afterProfit = Number(row.after_profit || 0)
      return {
        trader: row.trader,
        trades,
        avgDuration: formatDuration(Number(row.duration_seconds || 0)),
        avgLot: round(avgLot), avgRisk: round(avgRisk),
        winRate: percent(Number(row.wins || 0), trades), lossRate: percent(Number(row.losses || 0), trades),
        profitFactor: row.profit_factor == null ? null : Number(row.profit_factor),
        avgWin: round(Number(row.avg_win || 0)), avgLoss: round(Number(row.avg_loss || 0)),
        riskReward: row.risk_reward == null ? null : Number(row.risk_reward),
        tradesPerDay: Number(row.trades_per_day || 0), overtrading: Number(row.trades_per_day || 0) >= 20,
        maxLosses: 0, maxWins: 0, session: row.session || "Unclassified", topSymbol: row.top_symbol || "—",
        bestDay: dayNames[1], worstDay: dayNames[5], afterLoss, afterProfit,
        revengePattern: afterLoss >= 2, lotEscalation: avgLot > 0 && afterProfit >= 2,
      }
    })
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), analytics, summary: buildSummary(analytics) })
  } catch (error) {
    console.error("[trader-behaviour] analytics query failed", error)
    return NextResponse.json({ success: true, analytics: empty, summary: buildSummary(empty), unavailable: true, message: "Trade history is not available yet." })
  }
}

function round(value: number) { return Math.round(value * 100) / 100 }
function percent(value: number, total: number) { return total ? round((value / total) * 100) : 0 }
function formatDuration(seconds: number) { if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`; return `${round(seconds / 3600)}h` }
function buildSummary(rows: TraderAnalytics[]) { return { traders: rows.length, trades: rows.reduce((sum, row) => sum + row.trades, 0), overtrading: rows.filter((row) => row.overtrading).length, revenge: rows.filter((row) => row.revengePattern).length, escalation: rows.filter((row) => row.lotEscalation).length } }

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
