import { NextRequest, NextResponse } from "next/server"
import { getPool, withTransaction } from "@/lib/db"
import { getAccountBreach } from "@/lib/account-breach"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { DEFAULT_CHALLENGE_PLANS, getChallengePlan, getChallengeSnapshot } from "@/lib/challenge-account"
import { failChallengeAccount, getChallengeOpenPositionPnl, getLiveChallengeRates } from "@/lib/challenge-account-server"

import { refreshChallengeDays, isPriorSession } from '@/lib/challenge-days-server'

const PAYMENT_NETWORKS = new Set(["TRC20", "BEP20", "ERC20"])

function utcDateKey() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const db = getPool()
    if (!db) return NextResponse.json({ success: false, message: "Database unavailable" }, { status: 500 })

    const openPosition = await db.query(
      `SELECT 1 FROM participants p JOIN forex_trades t ON LOWER(t.participant_email) = LOWER(p.email)
       WHERE p.id = $1 AND p.account_type = 'challenge' AND p.challenge_status = 'active' AND t.status = 'open' LIMIT 1`,
      [auth.participantId],
    )
    const rates = openPosition.rowCount ? await getLiveChallengeRates(request.nextUrl.origin) : null
    const account = await withTransaction(async (client) => {
      const result = await client.query(
        `SELECT id, email, username, account_type, account_balance, challenge_plan_key,
                challenge_status, challenge_started_at, challenge_passed_at, challenge_passed_equity, challenge_failed_at,
                challenge_peak_equity, challenge_day_start_equity, challenge_day_start_date,
                challenge_trading_days, challenge_last_trading_date, funded_breach_status, funded_breach_at
         FROM participants WHERE id = $1 FOR UPDATE`,
        [auth.participantId],
      )
      const participant = result.rows[0]
      if (!participant) return null
      const plan = getChallengePlan(participant.challenge_plan_key)
      const currentStatus = participant.challenge_status || "not_started"
      const summary = { participant, plan, currentStatus, snapshot: null, metrics: null }
      if (participant.account_type !== "challenge") return summary
      if (currentStatus === "failed") {
        await failChallengeAccount(client, participant)
        participant.account_balance = 0
        return summary
      }
      if (!plan || !["active", "passed"].includes(currentStatus)) return summary

      if (currentStatus === 'active') participant.challenge_trading_days = await refreshChallengeDays(client, participant.id)
      const openTrades = (await client.query(
        `SELECT pair, direction, lot_size, open_price, swap, margin, open_timestamp
         FROM forex_trades WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
        [participant.email],
      )).rows
      const openPnl = getChallengeOpenPositionPnl(openTrades, rates)
      const openMargin = openTrades.reduce((total, trade) => total + (Number(trade.margin) || 0), 0)
      const balance = Number(participant.account_balance) || 0
      const equity = Number((balance + openMargin + openPnl.pnl).toFixed(2))
      const today = utcDateKey()
      const storedDayStartDate = participant.challenge_day_start_date
        ? new Date(participant.challenge_day_start_date).toISOString().slice(0, 10)
        : null
      const dayStartEquity = storedDayStartDate === today
        ? Number(participant.challenge_day_start_equity) || plan.startingBalance
        : equity
      const snapshot = getChallengeSnapshot(plan, equity, dayStartEquity, Number(participant.challenge_trading_days) || 0, currentStatus)

      if (currentStatus === "active" && openPnl.complete && !openTrades.some(t => isPriorSession(t.open_timestamp))) {
        if (snapshot.breached) {
          await failChallengeAccount(client, participant, equity)
          participant.account_balance = 0
          participant.challenge_failed_at = new Date().toISOString()
          return { ...summary, currentStatus: "failed", snapshot }
        }
        if (storedDayStartDate !== today) {
          await client.query(
            `UPDATE participants SET challenge_day_start_equity = $1, challenge_day_start_date = $2::date, updated_at = NOW() WHERE id = $3`,
            [equity, today, participant.id],
          )
          participant.challenge_day_start_equity = equity
          participant.challenge_day_start_date = today
        }
        if (snapshot.eligibleToPass && openTrades.length === 0) {
          await client.query(
            `UPDATE participants SET challenge_status = 'passed', challenge_passed_at = NOW(), challenge_passed_equity = $1,
               challenge_peak_equity = GREATEST(challenge_peak_equity, $1), updated_at = NOW() WHERE id = $2`,
            [equity, participant.id],
          )
          await client.query(
            `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
            [participant.email],
          )
          participant.challenge_passed_equity = equity
          return { ...summary, currentStatus: "passed", snapshot }
        }
      }
      return { ...summary, snapshot, metrics: {
        equity,
        balance,
        openMargin,
        unrealizedPnl: openPnl.pnl,
        openPositions: openTrades.length,
        quotesCurrent: openPnl.complete,
        dayStartEquity,
        profitTarget: snapshot.profitTarget,
        maxEquityDrawdown: snapshot.maxEquityDrawdown,
        dailyLossFloor: snapshot.dailyLossFloor,
        profitPercent: snapshot.profitPercent,
        dailyLossPercent: snapshot.dailyLossPercent,
        drawdownPercent: snapshot.drawdownPercent,
        progressPercent: Math.max(0, Math.min(100, ((equity - plan.startingBalance) / (snapshot.profitTarget - plan.startingBalance)) * 100)),
      } }
    })
    if (!account) return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })
    const { participant, plan, currentStatus, snapshot, metrics } = account

    const recentTradesResult = participant.account_type === "challenge"
      ? await db.query(
          `SELECT id, pair, direction, final_pnl, close_time
           FROM forex_trades
           WHERE LOWER(participant_email) = LOWER($1) AND status = 'closed'
           ORDER BY updated_at DESC LIMIT 8`,
          [participant.email],
        )
      : { rows: [] }

    const paymentResult = await db.query(
      `SELECT status, transaction_id, amount, created_at, admin_notes
       FROM topup_requests
       WHERE participant_id = $1 AND payment_method = 'challenge'
       ORDER BY created_at DESC LIMIT 1`,
      [participant.id],
    )
    const rewardResult = participant.account_type === "challenge" && currentStatus === "passed"
      ? await db.query(
          `SELECT id, eligible_amount, status, payout_method, wallet_address, admin_note, transaction_hash, created_at, updated_at
           FROM challenge_reward_requests WHERE participant_id = $1 LIMIT 1`,
          [participant.id],
        )
      : { rows: [] }
    const payment = paymentResult.rows[0]
    const paymentNotes = String(payment?.admin_notes || "")
    const paymentCurrency = /(?:^|; )payment_currency=(INR|USDT)(?:;|$)/.exec(paymentNotes)?.[1] || "USDT"
    const inrAmount = Number(/(?:^|; )inr_amount=([0-9.]+)(?:;|$)/.exec(paymentNotes)?.[1]) || null

    return NextResponse.json({
      success: true,
      participant: { ...participant, challenge_status: currentStatus },
      plan,
      snapshot,
      metrics,
      recentTrades: recentTradesResult.rows,
      rewardRequest: rewardResult.rows[0] || null,
      paymentReview: payment ? {
        status: payment.status,
        transactionId: payment.transaction_id,
        amount: Number(payment.amount) || 0,
        submittedAt: payment.created_at,
        paymentCurrency,
        inrAmount,
        adminNote: String(payment.admin_notes || "").match(/(?:^|\n)Admin review: (.+)$/m)?.[1] || null,
      } : null,
      plans: DEFAULT_CHALLENGE_PLANS,
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[v0] Challenge GET error:", error)
    return NextResponse.json({ success: false, message: "Unable to load Challenge account" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const plan = getChallengePlan(body?.planKey)
    const paymentMethod = String(body?.paymentMethod || "USDT").trim().toUpperCase()
    const isInrPayment = paymentMethod === "INR"
    const transactionHash = (isInrPayment ? body?.upiReference : body?.transactionHash)
    const transactionId = typeof transactionHash === "string" ? transactionHash.trim().toUpperCase() : ""
    const walletAddress = typeof body?.walletAddress === "string" ? body.walletAddress.trim() : ""
    const expectedInrAmount = Number(body?.inrAmount)
    const paymentNetwork = isInrPayment ? "INR" : String(body?.paymentNetwork || "").trim().toUpperCase()
    const validTransactionId = isInrPayment
      ? /^[A-Z0-9]{8,40}$/.test(transactionId)
      : transactionId.length >= 8 && transactionId.length <= 200

    if (!plan || !["INR", "USDT"].includes(paymentMethod) || !validTransactionId || (isInrPayment && (!Number.isFinite(expectedInrAmount) || expectedInrAmount <= 0)) || (!isInrPayment && (walletAddress.length < 8 || walletAddress.length > 160 || !PAYMENT_NETWORKS.has(paymentNetwork)))) {
      return NextResponse.json({ success: false, message: isInrPayment ? "Choose a valid plan and enter the UPI transaction reference (UTR)." : "Choose a valid plan and network, then enter the transaction hash and sending wallet." }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const participantResult = await client.query(
        `SELECT id, email, account_type, challenge_status, challenge_failed_at, funded_breach_status, funded_breach_at
         FROM participants WHERE id = $1 FOR UPDATE`,
        [auth.participantId],
      )
      const participant = participantResult.rows[0]
      if (!participant) return { error: "Participant not found", status: 404 }
      const breach = getAccountBreach(participant)
      if (participant.account_type !== "challenge" && !breach) {
        return { error: "Switch to a Challenge account from your dashboard before enrolling.", status: 403 }
      }
      if (!breach && ["active", "pending_payment", "passed"].includes(participant.challenge_status)) {
        return { error: "Your Challenge account already has a payment or evaluation in progress.", status: 409 }
      }
      if (breach) {
        const pending = await client.query(
          `SELECT 1 FROM topup_requests WHERE participant_id = $1
             AND LOWER(status) IN ('pending', 'pending_collection', 'processing')
             AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz) LIMIT 1`,
          [participant.id, breach.occurredAt],
        )
        if (pending.rowCount) return { error: "Your replacement payment is already under review. Wait for its review before sending another.", status: 409 }
      }

      await client.query("SELECT pg_advisory_xact_lock(hashtextextended(LOWER($1::text), 0))", [transactionId])
      const duplicate = await client.query(
        `SELECT id FROM topup_requests WHERE LOWER(transaction_id) = LOWER($1) LIMIT 1`,
        [transactionId],
      )
      if (duplicate.rows.length) return { error: "This transaction has already been submitted.", status: 409 }

      let notes: string
      if (isInrPayment) {
        const rateResult = await client.query(
          "SELECT setting_value FROM system_settings WHERE setting_key = 'topup_usdt_inr_rate' LIMIT 1",
        )
        const configuredRate = Number(rateResult.rows[0]?.setting_value)
        const inrRate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 104
        const inrAmount = Number((plan.fee * inrRate).toFixed(2))
        if (Math.abs(expectedInrAmount - inrAmount) > 0.01) {
          return { error: "The INR conversion has changed. Refresh the page and pay the updated amount.", status: 409 }
        }
        notes = `challenge_plan_key=${plan.key}; payment_currency=INR; payment_method=UPI; payment_network=INR; inr_amount=${inrAmount.toFixed(2)}; inr_rate=${inrRate}`
      } else {
        notes = `challenge_plan_key=${plan.key}; payment_currency=USDT; payment_method=crypto; payment_network=${paymentNetwork}; sender_wallet=${walletAddress}`
      }
      if (participant.challenge_status === "failed") await failChallengeAccount(client, participant)
      await client.query(
        `INSERT INTO topup_requests
          (participant_id, participant_email, amount, transaction_id, payment_method, status, admin_notes)
         VALUES ($1, $2, $3, $4, 'challenge', 'pending', $5)`,
        [participant.id, participant.email, plan.fee, transactionId, notes],
      )
      await client.query(
        `UPDATE participants SET challenge_plan_key = $1, challenge_status = 'pending_payment', updated_at = NOW()
         WHERE id = $2`,
        [plan.key, participant.id],
      )

      return { success: true }
    })

    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status })
    }
    return NextResponse.json({
      success: true,
      message: isInrPayment
        ? "UPI payment reference submitted for review. Your virtual account balance will be activated after approval."
        : "Challenge fee submitted for review. Your virtual account balance will be activated after approval.",
    })
  } catch (error) {
    console.error("[v0] Challenge POST error:", error)
    return NextResponse.json({ success: false, message: "Unable to submit Challenge payment" }, { status: 500 })
  }
}
