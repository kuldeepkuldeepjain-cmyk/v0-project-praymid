import { NextRequest, NextResponse } from 'next/server'
import { getPool, withTransaction } from '@/lib/db'
import { calculateChallengePnl, getChallengePlan, getChallengeSnapshot } from '@/lib/challenge-account'
import { failChallengeAccount, getChallengeExecutionPrice, getLiveChallengeRates } from '@/lib/challenge-account-server'
import { refreshChallengeDays } from '@/lib/challenge-days-server'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const db = getPool()
  if (!db) return new Response('Database unavailable', { status: 503 })
  const cutoff = Math.floor(Date.now() / 86400000) * 86400000
  const accounts = await db.query(`SELECT DISTINCT p.id FROM participants p JOIN forex_trades t ON t.participant_id = p.id
    WHERE p.account_type = 'challenge' AND p.challenge_status = 'active' AND t.status = 'open' AND t.open_timestamp < $1`, [cutoff])
  let settled = 0, deferred = 0
  for (const { id } of accounts.rows) {
    try {
      const rates = await getLiveChallengeRates(request.nextUrl.origin)
      await withTransaction(async client => {
        const { rows: [account] } = await client.query(`SELECT id, email, account_balance, challenge_day_start_equity, challenge_plan_key FROM participants
          WHERE id = $1 AND account_type = 'challenge' AND challenge_status = 'active' FOR UPDATE`, [id])
        if (!account) return
        const plan = getChallengePlan(account.challenge_plan_key)
        if (!plan) throw new Error('Missing plan')
        const { rows: trades } = await client.query(`SELECT id, pair, direction, open_price, lot_size, margin, open_timestamp FROM forex_trades
          WHERE participant_id = $1 AND status = 'open' ORDER BY open_timestamp, id FOR UPDATE`, [id])
        if (!trades.length || trades.every(t => Number(t.open_timestamp) >= cutoff)) return
        if (trades.some(t => Number(t.open_timestamp) >= cutoff)) throw new Error('Mixed trading sessions')
        let balance = Number(account.account_balance)
        const closeTime = new Date().toISOString()
        for (const trade of trades) {
          const price = getChallengeExecutionPrice(rates, trade.pair, trade.direction, true)
          if (price === null) throw new Error('Quote unavailable')
          const { pnl, pips } = calculateChallengePnl(trade.pair, trade.direction, Number(trade.lot_size), Number(trade.open_price), price, 0, rates)
          if (!Number.isFinite(pnl)) throw new Error('Currency conversion quote unavailable')
          const amount = Number((Number(trade.margin) + pnl).toFixed(2))
          const next = Number((balance + amount).toFixed(2))
          await client.query(`UPDATE forex_trades SET status = 'closed', close_reason = 'day_end', close_price = $2, close_time = $3,
            final_pnl = $4, final_pips = $5, final_swap = 0, updated_at = NOW() WHERE id = $1 AND status = 'open'`, [trade.id, price, closeTime, pnl, pips])
          await client.query(`INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'completed')`, [id, account.email, amount < 0 ? 'forex_pnl_loss' : 'forex_pnl_profit', Math.abs(amount), `Daily auto-close — ${trade.id}`, balance, next])
          balance = next
        }
        const days = await refreshChallengeDays(client, id)
        const snapshot = getChallengeSnapshot(plan, balance, Number(account.challenge_day_start_equity) || plan.startingBalance, days)
        if (snapshot.breached) await failChallengeAccount(client, account, balance)
        else {
          await client.query(`UPDATE participants SET account_balance = $2, challenge_peak_equity = GREATEST(challenge_peak_equity, $2),
            challenge_status = $3, challenge_passed_at = CASE WHEN $3 = 'passed' THEN NOW() ELSE challenge_passed_at END,
            challenge_passed_equity = CASE WHEN $3 = 'passed' THEN $2 ELSE challenge_passed_equity END, updated_at = NOW() WHERE id = $1`, [id, balance, snapshot.status])
          if (snapshot.eligibleToPass) await client.query(`UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW() WHERE participant_id = $1 AND status = 'pending'`, [id])
        }
      })
      settled++
    } catch { deferred++ }
  }
  return NextResponse.json({ settled, deferred }, { status: deferred ? 503 : 200 })
}
