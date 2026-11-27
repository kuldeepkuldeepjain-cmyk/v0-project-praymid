import 'server-only'
import type { PoolClient } from 'pg'

// Call while holding the participant lock. Reopening on the same UTC date
// temporarily removes that date until the account is flat again.
export async function refreshChallengeDays(client: PoolClient, participantId: string, startingBalance: number, dailyProfitCreditPercent = 4) {
  const { rows: [progress] } = await client.query(`
    WITH completed AS (
      SELECT (to_timestamp(t.open_timestamp / 1000.0) AT TIME ZONE 'UTC')::date AS day,
        COALESCE(SUM(t.final_pnl), 0) AS net
      FROM forex_trades t JOIN participants p ON p.id = t.participant_id
      WHERE p.id = $1 AND t.created_at >= p.challenge_started_at
        AND t.open_timestamp IS NOT NULL AND t.status IN ('open', 'closed')
      GROUP BY 1 HAVING bool_and(t.status = 'closed')
    ) SELECT count(*)::int AS days, max(day)::text AS last,
        COALESCE(SUM(LEAST(net, $2::numeric * $3::numeric / 100)), 0)::numeric AS credited_profit
      FROM completed`, [participantId, startingBalance, dailyProfitCreditPercent])
  await client.query(`UPDATE participants SET challenge_trading_days = $2, challenge_last_trading_date = $3::date
    WHERE id = $1 AND (challenge_trading_days, challenge_last_trading_date) IS DISTINCT FROM ($2::int, $3::date)`,
    [participantId, progress.days, progress.last])
  return { days: Number(progress.days), lastDay: progress.last as string | null, creditedProfit: Number(progress.credited_profit) }
}

export function challengeDeadlineReached(days: number, lastDay: string | null, maximumTradingDays = 5, today = new Date().toISOString().slice(0, 10)) {
  return days > maximumTradingDays || (days >= maximumTradingDays && lastDay !== null && lastDay < today)
}

export function isPriorSession(timestamp: unknown, now = Date.now()) {
  return Number(timestamp) < Math.floor(now / 86400000) * 86400000
}

export function requireCurrentSession(positions: { open_timestamp?: unknown }[]) {
  if (positions.some(p => isPriorSession(p.open_timestamp))) {
    throw Object.assign(new Error('Daily auto-close is pending a market quote. Trading resumes after settlement.'), { status: 409 })
  }
}
