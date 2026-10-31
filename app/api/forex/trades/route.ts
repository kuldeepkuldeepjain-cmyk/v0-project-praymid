import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { calculateChallengeMargin, calculateChallengePnl, getChallengePlan, getChallengeSnapshot } from "@/lib/challenge-account"
import { getChallengeExecutionPrice, getChallengeOpenPositionPnl, getLiveChallengeRates } from "@/lib/challenge-account-server"
import { enforceRateLimit, getActiveRestriction, getSecurityContext, inspectTradeRisk, recordSecurityEvent, recordTradeRiskFlags, updateParticipantSecurityProfile } from "@/lib/security"

function utcDateKey() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * GET /api/forex/trades?email=...
 * Returns { open, pending, closed } trade rows for the authenticated participant.
 */
export async function GET(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response
  const context = getSecurityContext(req)
  const rate = await enforceRateLimit("api", `${auth.email}:${context.ipAddress || "unknown"}`)
  if (!rate.allowed) return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })

  const { searchParams } = new URL(req.url)
  const requestedEmail = searchParams.get("email")?.trim()
  const email = auth.email
  if (requestedEmail && requestedEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = getPool()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

  try {
      const { rows } = await db.query(
      `SELECT id, participant_id, participant_email, pair, direction, lot_size, leverage,
              open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
              order_type, target_price, expiry, close_price, close_reason,
              COALESCE(final_pnl, 0) AS final_pnl,
              COALESCE(final_pips, 0) AS final_pips,
              COALESCE(final_swap, 0) AS final_swap,
              status, open_time, open_timestamp, close_time,
              close_duration, created_at, updated_at
       FROM forex_trades
       WHERE LOWER(participant_email) = LOWER($1)
       ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC`,
      [email]
    )

    const open = rows.filter((r: any) => r.status === "open").map(toOpenTrade)
    const pending = rows.filter((r: any) => r.status === "pending").map(toPendingOrder)
    const closed = rows.filter((r: any) => r.status === "closed").map(toClosedTrade).slice(0, 100)

    return NextResponse.json({ success: true, open, pending, closed }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/forex/trades
 * Body: { participant_email, action: "open" | "pending" | "partial_close", trade: {...} }
 * Inserts a new open position, pending order, or a partial-close history row.
 */
export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response
  const context = getSecurityContext(req)
  const rate = await enforceRateLimit("trade", `${auth.email}:${context.ipAddress || "unknown"}`)
  if (!rate.allowed) {
    await recordSecurityEvent({ eventType: "trade_rate_limited", actorType: "participant", actorEmail: auth.email, request: req, riskScore: 70 })
    return NextResponse.json({ success: false, error: "Trading request limit reached. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })
  }
  const restriction = await getActiveRestriction(auth.email, "trading")
  if (restriction) {
    await recordSecurityEvent({ eventType: "trade_blocked_restriction", actorType: "participant", actorEmail: auth.email, request: req, riskScore: 100, metadata: { restrictionType: restriction.restrictionType } })
    return NextResponse.json({ success: false, error: "Trading is temporarily restricted while your account is under security review." }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { participant_email, action, trade } = body
    const allowedActions = new Set(["open", "pending", "partial_close", "sync"])
    if (typeof participant_email !== "string" || !participant_email.trim() || !allowedActions.has(action) || !trade?.id) {
      return NextResponse.json({ success: false, error: "Invalid trade request" }, { status: 400 })
    }
    const allowedDirections = new Set(["BUY", "SELL"])
    const allowedOrderTypes = new Set(["MARKET", "LIMIT", "STOP", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"])
    if (typeof trade.pair !== "string" || !trade.pair.trim() || !allowedDirections.has(trade.direction)) {
      return NextResponse.json({ success: false, error: "Instrument and direction are required" }, { status: 400 })
    }
    if (action === "pending" && (typeof trade.orderType !== "string" || !allowedOrderTypes.has(trade.orderType))) {
      return NextResponse.json({ success: false, error: "Unsupported pending order type" }, { status: 400 })
    }
    const numericTradeFields = [trade.lotSize, trade.leverage, trade.openPrice, trade.targetPrice, trade.margin, trade.sl, trade.tp].filter((value) => value !== undefined && value !== null)
    if (numericTradeFields.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      return NextResponse.json({ success: false, error: "Invalid trade values" }, { status: 400 })
    }
    if ((action === "open" || action === "pending") && (!Number.isFinite(trade.lotSize) || trade.lotSize <= 0 || trade.lotSize > 1000 || !Number.isFinite(trade.leverage) || trade.leverage <= 0 || trade.leverage > 100)) {
      return NextResponse.json({ success: false, error: "Lot size and leverage must be greater than zero" }, { status: 400 })
    }
    if (action === "open" && (!Number.isFinite(trade.margin) || trade.margin <= 0)) {
      return NextResponse.json({ success: false, error: "Margin must be greater than zero" }, { status: 400 })
    }
    if ((action === "open" || action === "pending") && (!Number.isFinite(trade.openPrice) || trade.openPrice <= 0)) {
      return NextResponse.json({ success: false, error: "A valid execution price is required" }, { status: 400 })
    }
    if (action === "pending" && (!Number.isFinite(trade.targetPrice) || trade.targetPrice <= 0)) {
      return NextResponse.json({ success: false, error: "A valid target price is required for pending orders" }, { status: 400 })
    }
    if ((action === "open" || action === "pending") && Number.isFinite(trade.openPrice)) {
      const entry = Number(trade.openPrice)
      const sl = trade.sl === null || trade.sl === undefined ? null : Number(trade.sl)
      const tp = trade.tp === null || trade.tp === undefined ? null : Number(trade.tp)
      const validSl = sl === null || (Number.isFinite(sl) && sl > 0 && (trade.direction === "BUY" ? sl < entry : sl > entry))
      const validTp = tp === null || (Number.isFinite(tp) && tp > 0 && (trade.direction === "BUY" ? tp > entry : tp < entry))
      if (!validSl || !validTp) return NextResponse.json({ success: false, error: "Stop loss and take profit must be valid for the trade direction" }, { status: 400 })
    }
    if (auth.email.toLowerCase() !== participant_email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const db = getPool()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

    const participantRows = await db.query(
      `SELECT id, account_frozen, is_frozen, account_type, funded_breach_status,
              challenge_status, challenge_plan_key, challenge_trading_days,
              challenge_last_trading_date, challenge_day_start_equity, challenge_peak_equity
       FROM participants WHERE LOWER(email) = LOWER($1)`,
      [participant_email],
    )
    const participant = participantRows.rows[0]
    const participantId = participant?.id ?? null
    const isChallengeAccount = participant?.account_type === "challenge"
    const challengePlan = isChallengeAccount ? getChallengePlan(participant?.challenge_plan_key) : null
    if ((action === "open" || action === "pending") && isChallengeAccount && participant.challenge_status !== "active") {
      return NextResponse.json({ success: false, error: "Challenge trading is available only while your evaluation is active." }, { status: 403 })
    }
    if ((action === "open" || action === "pending") && isChallengeAccount && (!challengePlan || Number(trade.leverage) > challengePlan.leverage)) {
      return NextResponse.json({ success: false, error: `Challenge leverage is capped at ${challengePlan?.leverage ?? 30}:1.` }, { status: 400 })
    }
    if ((action === "open" || action === "pending") && participant?.account_type === "funded") {
      if (!Number.isFinite(trade.lotSize) || trade.lotSize < 0.01) {
        return NextResponse.json({ success: false, error: "Funded accounts require a minimum lot size of 0.01" }, { status: 400 })
      }
      if (!Number.isFinite(trade.leverage) || trade.leverage < 1 || trade.leverage > 100) {
        return NextResponse.json({ success: false, error: "Funded accounts allow leverage up to 100x" }, { status: 400 })
      }
      if (action === "open" && (!Number.isFinite(trade.margin) || trade.margin < 3000)) {
        return NextResponse.json({ success: false, error: "Funded accounts require a minimum order amount of 3000" }, { status: 400 })
      }
    }
    let challengeRates: Awaited<ReturnType<typeof getLiveChallengeRates>> = null
    let challengeExecutionPrice: number | null = null
    if (isChallengeAccount && (action === "open" || action === "partial_close")) {
      challengeRates = await getLiveChallengeRates(req.nextUrl.origin)
      if (!challengeRates) {
        return NextResponse.json({ success: false, error: "A fresh server-side market quote is required for Challenge trades." }, { status: 503 })
      }
    }
    if (isChallengeAccount && action === "open") {
      challengeExecutionPrice = getChallengeExecutionPrice(challengeRates, trade.pair, trade.direction)
      if (challengeExecutionPrice === null) {
        return NextResponse.json({ success: false, error: "A fresh server-side market quote is required for Challenge trades." }, { status: 503 })
      }
      const challengeSl = trade.sl === null || trade.sl === undefined ? null : Number(trade.sl)
      const challengeTp = trade.tp === null || trade.tp === undefined ? null : Number(trade.tp)
      const validChallengeSl = challengeSl === null || (trade.direction === "BUY" ? challengeSl < challengeExecutionPrice : challengeSl > challengeExecutionPrice)
      const validChallengeTp = challengeTp === null || (trade.direction === "BUY" ? challengeTp > challengeExecutionPrice : challengeTp < challengeExecutionPrice)
      if (!validChallengeSl || !validChallengeTp) {
        return NextResponse.json({ success: false, error: "Stop loss and take profit must be valid for the verified execution price." }, { status: 400 })
      }
    }

    const tradeRisk = action === "open" || action === "pending"
      ? await inspectTradeRisk({ email: participant_email, trade })
      : { riskScore: 0, flags: [] as string[] }
    const securityProfile = await updateParticipantSecurityProfile(participant_email, req, tradeRisk.riskScore)
    if (securityProfile.duplicateAccountCount > 0) {
      tradeRisk.flags.push("duplicate_account_signal")
      tradeRisk.riskScore = Math.max(tradeRisk.riskScore, 60)
    }
    if (tradeRisk.riskScore >= 75 && action !== "sync") {
      await recordSecurityEvent({ eventType: "trade_blocked_high_risk", actorType: "participant", actorEmail: participant_email, request: req, resourceType: "forex_trade", resourceId: String(trade.id), riskScore: tradeRisk.riskScore, metadata: { flags: tradeRisk.flags } })
      return NextResponse.json({ success: false, error: "Trade blocked by risk controls" }, { status: 403 })
    }

    if (participant?.account_type !== "funded" && (participant?.account_frozen || participant?.is_frozen) && (action === "open" || action === "pending")) {
      return NextResponse.json({ success: false, error: "Account is frozen" }, { status: 403 })
    }

    // No recovery after breach: a funded account that hit the fixed 2%
    // drawdown limit can never open a new position or pending order again.
    if (participant?.account_type === "funded" && participant?.funded_breach_status === "breached" && action !== "sync") {
      return NextResponse.json({ success: false, error: "Funded account breached the fixed 2% drawdown rule. Trading activity is disabled until the account is reactivated." }, { status: 403 })
    }

    if (action === "open") {
      if (!participant) return NextResponse.json({ success: false, error: "Participant account was not found" }, { status: 404 })
      const executionPrice = isChallengeAccount ? challengeExecutionPrice : Number(trade.openPrice)
      const client = await db.connect()
      try {
        await client.query("BEGIN")
        const accountResult = await client.query(
          `SELECT id, account_balance, account_type, challenge_status, challenge_plan_key,
                  challenge_trading_days, challenge_last_trading_date, challenge_day_start_equity,
                  challenge_peak_equity
           FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
          [participant_email],
        )
        const account = accountResult.rows[0]
        if (!account) throw Object.assign(new Error("Participant account was not found"), { status: 404 })
        const accountIsChallenge = account.account_type === "challenge"
        const accountChallengePlan = accountIsChallenge ? getChallengePlan(account.challenge_plan_key) : null
        if (accountIsChallenge && (account.challenge_status !== "active" || !accountChallengePlan)) {
          throw Object.assign(new Error("Challenge trading is not active."), { status: 403 })
        }
        const margin = accountIsChallenge
          ? calculateChallengeMargin(trade.pair, trade.lotSize, Number(executionPrice), trade.leverage)
          : Number(trade.margin)
        if (!Number.isFinite(margin) || margin <= 0) throw Object.assign(new Error("Invalid margin"), { status: 400 })
        if (accountIsChallenge && trade.leverage > (accountChallengePlan?.leverage ?? 30)) {
          throw Object.assign(new Error(`Challenge leverage is capped at ${accountChallengePlan?.leverage ?? 30}:1.`), { status: 400 })
        }
        const balanceBefore = Number(account.account_balance) || 0
        if (balanceBefore < margin) throw Object.assign(new Error(`Insufficient balance. Available: $${balanceBefore.toFixed(2)}, required: $${margin.toFixed(2)}`), { status: 400 })

        if (accountIsChallenge && accountChallengePlan) {
          const currentPositions = await client.query(
            `SELECT pair, direction, lot_size, open_price FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const currentPnl = getChallengeOpenPositionPnl(currentPositions.rows, challengeRates)
          if (!currentPnl.complete) throw Object.assign(new Error("Current market quotes are unavailable for your open Challenge positions."), { status: 503 })
          const committed = await client.query(
            `SELECT COALESCE(SUM(margin), 0) AS amount FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const equityBefore = Number((balanceBefore + Number(committed.rows[0]?.amount || 0) + currentPnl.pnl).toFixed(2))
          const today = utcDateKey()
          const lastTradingDate = String(account.challenge_last_trading_date || "").slice(0, 10)
          const isNewTradingDay = lastTradingDate !== today
          const dayStartEquity = isNewTradingDay
            ? equityBefore
            : Number(account.challenge_day_start_equity) || accountChallengePlan.startingBalance
          const tradingDays = (Number(account.challenge_trading_days) || 0) + (isNewTradingDay ? 1 : 0)
          const snapshot = getChallengeSnapshot(accountChallengePlan, equityBefore, dayStartEquity, tradingDays, "active")
          if (snapshot.breached) {
            await client.query(
              `UPDATE participants SET challenge_status = 'failed', challenge_failed_at = NOW(),
                 challenge_peak_equity = GREATEST(COALESCE(challenge_peak_equity, $1), $1), updated_at = NOW()
               WHERE id = $2`,
              [equityBefore, account.id],
            )
            await client.query(
              `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
              [participant_email],
            )
            await client.query("COMMIT")
            return NextResponse.json({ success: false, error: "Challenge loss limit reached. The evaluation is now failed." }, { status: 403 })
          }

          const inserted = await client.query(
            `INSERT INTO forex_trades
               (id, participant_id, participant_email, pair, direction, lot_size, leverage,
                open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
                status, open_time, open_timestamp)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$8,$12,0,'open',$13,$14)
             ON CONFLICT (id) DO NOTHING RETURNING id`,
            [trade.id, account.id, participant_email, trade.pair, trade.direction, trade.lotSize,
              trade.leverage, executionPrice, trade.sl, trade.tp, trade.trailingStopPips,
              margin, trade.openTime, trade.openTimestamp],
          )
          if (inserted.rowCount !== 1) {
            const existing = await client.query("SELECT participant_email, status FROM forex_trades WHERE id = $1", [trade.id])
            if (existing.rows[0]?.participant_email?.toLowerCase() !== participant_email.toLowerCase() || existing.rows[0]?.status !== "open") {
              throw Object.assign(new Error("Trade ID already exists"), { status: 409 })
            }
            await client.query("COMMIT")
            return NextResponse.json({ success: true, alreadySaved: true, newBalance: balanceBefore })
          }
          const balanceAfter = Number((balanceBefore - margin).toFixed(2))
          await client.query(
            `UPDATE participants SET account_balance = $1, challenge_day_start_equity = $2,
               challenge_trading_days = $3, challenge_last_trading_date = $4::date,
               challenge_peak_equity = GREATEST(COALESCE(challenge_peak_equity, $5), $5), updated_at = NOW()
             WHERE id = $6`,
            [balanceAfter, dayStartEquity, tradingDays, today, equityBefore, account.id],
          )
          await client.query(
            `INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
             VALUES ($1, $2, 'forex_margin_lock', $3, $4, $5, $6, 'completed')`,
            [account.id, participant_email, margin, `Margin locked — ${trade.pair} ${trade.direction} — ${trade.id}`, balanceBefore, balanceAfter],
          )
          await client.query("COMMIT")
          return NextResponse.json({
            success: true,
            riskFlags: tradeRisk.flags,
            newBalance: balanceAfter,
            execution: { price: executionPrice, margin },
          })
        }

        const inserted = await client.query(
          `INSERT INTO forex_trades
             (id, participant_id, participant_email, pair, direction, lot_size, leverage,
              open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
              status, open_time, open_timestamp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,'open',$14,$15)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [trade.id, account.id, participant_email, trade.pair, trade.direction,
            trade.lotSize, trade.leverage, trade.openPrice, trade.sl, trade.tp,
            trade.trailingStopPips, trade.trailingPeak, margin, trade.openTime, trade.openTimestamp]
        )
        if (inserted.rowCount !== 1) {
          const existing = await client.query("SELECT participant_email, status FROM forex_trades WHERE id = $1", [trade.id])
          if (existing.rows[0]?.participant_email?.toLowerCase() !== participant_email.toLowerCase() || existing.rows[0]?.status !== "open") {
            throw Object.assign(new Error("Trade ID already exists"), { status: 409 })
          }
          await client.query("COMMIT")
          return NextResponse.json({ success: true, alreadySaved: true, newBalance: balanceBefore })
        }
        const balanceAfter = Number((balanceBefore - margin).toFixed(2))
        await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [balanceAfter, account.id])
        await client.query(
          `INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
           VALUES ($1, $2, 'forex_margin_lock', $3, $4, $5, $6, 'completed')`,
          [account.id, participant_email, margin, `Margin locked — ${trade.pair} ${trade.direction} — ${trade.id}`, balanceBefore, balanceAfter],
        )
        await client.query("COMMIT")
        return NextResponse.json({ success: true, riskFlags: tradeRisk.flags, newBalance: balanceAfter })
      } catch (error: any) {
        await client.query("ROLLBACK")
        if (error?.status) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
        throw error
      } finally {
        client.release()
      }
    } else if (action === "pending") {
      const inserted = await db.query(
        `INSERT INTO forex_trades
           (id, participant_id, participant_email, pair, direction, lot_size, leverage,
            open_price, sl, tp, order_type, target_price, expiry, margin, swap,
            status, open_time, open_timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,'pending',$14,$15)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          trade.id, participantId, participant_email, trade.pair, trade.direction,
          trade.lotSize, trade.leverage, trade.targetPrice, trade.sl, trade.tp,
          trade.orderType, trade.targetPrice, trade.expiry,
          trade.createdTime, Date.now(),
        ]
      )
      if (inserted.rowCount !== 1) {
        const existing = await db.query(
          "SELECT participant_email, status FROM forex_trades WHERE id = $1",
          [trade.id],
        )
        if (existing.rows[0]?.participant_email?.toLowerCase() !== participant_email.toLowerCase() || existing.rows[0]?.status !== "pending") {
          return NextResponse.json({ success: false, error: "Trade ID already exists" }, { status: 409 })
        }
      }
    } else if (action === "partial_close") {
      const sourceTradeId = typeof trade.sourceTradeId === "string" ? trade.sourceTradeId : ""
      const remainingLotSize = Number(trade.remainingLotSize)
      const remainingMargin = Number(trade.remainingMargin)
      if (!sourceTradeId || !Number.isFinite(remainingLotSize) || remainingLotSize <= 0 || !Number.isFinite(remainingMargin) || remainingMargin < 0) {
        return NextResponse.json({ success: false, error: "Invalid partial close values" }, { status: 400 })
      }

      const client = await db.connect()
      try {
        await client.query("BEGIN")
        const existingClose = await client.query(
          "SELECT participant_email, status FROM forex_trades WHERE id = $1 FOR UPDATE",
          [trade.id],
        )
        if (existingClose.rows.length > 0) {
          await client.query("ROLLBACK")
          const existingRow = existingClose.rows[0]
          if (existingRow.participant_email?.toLowerCase() === participant_email.toLowerCase() && existingRow.status === "closed") {
            return NextResponse.json({ success: true, alreadySaved: true })
          }
          return NextResponse.json({ success: false, error: "Trade ID already exists" }, { status: 409 })
        }

        if (isChallengeAccount) {
          const parentResult = await client.query(
            `SELECT id, participant_id, pair, direction, lot_size, leverage, open_price,
                    sl, tp, trailing_stop_pips, trailing_peak, margin, open_time, open_timestamp, status
             FROM forex_trades
             WHERE id = $1 AND LOWER(participant_email) = LOWER($2) FOR UPDATE`,
            [sourceTradeId, participant_email],
          )
          const parent = parentResult.rows[0]
          const closeLots = Number(trade.lotSize)
          const parentLots = Number(parent?.lot_size)
          if (!parent || parent.status !== "open" || !Number.isFinite(closeLots) || closeLots <= 0 || closeLots >= parentLots) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Open trade was not found or the partial close amount is invalid." }, { status: 409 })
          }

          const executionPrice = getChallengeExecutionPrice(challengeRates, parent.pair, parent.direction, true)
          if (executionPrice === null) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "A current quote is unavailable for this instrument." }, { status: 503 })
          }
          const fractionClosed = closeLots / parentLots
          const closedMargin = Number((Number(parent.margin) * fractionClosed).toFixed(2))
          const nextLots = Number((parentLots - closeLots).toFixed(2))
          const nextMargin = Number((Number(parent.margin) - closedMargin).toFixed(2))
          const calculated = calculateChallengePnl(parent.pair, parent.direction, closeLots, Number(parent.open_price), executionPrice)
          const actualCloseTime = new Date().toISOString()
          const participantResult = await client.query(
            `SELECT id, account_balance, challenge_status, challenge_plan_key,
                    challenge_trading_days, challenge_last_trading_date,
                    challenge_day_start_equity, challenge_peak_equity
             FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
            [participant_email],
          )
          const participant = participantResult.rows[0]
          if (!participant) throw new Error("Participant account was not found")
          const balanceBefore = Number(participant.account_balance) || 0
          const settlement = Number((closedMargin + calculated.pnl).toFixed(2))
          const balanceAfter = Number((balanceBefore + settlement).toFixed(2))

          const preClosePositionsResult = await client.query(
            `SELECT pair, direction, lot_size, open_price FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const preClosePnl = getChallengeOpenPositionPnl(preClosePositionsResult.rows, challengeRates)
          const preCloseMarginResult = await client.query(
            `SELECT COALESCE(SUM(margin), 0) AS amount FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const equityBefore = Number((balanceBefore + Number(preCloseMarginResult.rows[0]?.amount || 0) + (preClosePnl.complete ? preClosePnl.pnl : 0)).toFixed(2))

          await client.query(
            `UPDATE forex_trades SET lot_size = $1, margin = $2, updated_at = NOW()
             WHERE id = $3 AND LOWER(participant_email) = LOWER($4) AND status = 'open'`,
            [nextLots, nextMargin, sourceTradeId, participant_email],
          )
          const insertedClose = await client.query(
            `INSERT INTO forex_trades
               (id, participant_id, participant_email, pair, direction, lot_size, leverage,
                open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
                close_price, close_reason, final_pnl, final_pips, final_swap,
                status, open_time, open_timestamp, close_time, close_duration)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15,$16,$17,0,'closed',$18,$19,$20,$21)
             ON CONFLICT (id) DO NOTHING RETURNING id`,
            [trade.id, parent.participant_id, participant_email, parent.pair, parent.direction,
              closeLots, parent.leverage, parent.open_price, parent.sl, parent.tp,
              parent.trailing_stop_pips, parent.trailing_peak, closedMargin, executionPrice,
              trade.closeReason || "manual", calculated.pnl, calculated.pips,
              parent.open_time, parent.open_timestamp, actualCloseTime, trade.closeDuration || null],
          )
          if (!insertedClose.rowCount) throw Object.assign(new Error("Trade ID already exists"), { status: 409 })

          const plan = getChallengePlan(participant.challenge_plan_key)
          let challengeStatus = participant.challenge_status
          let nextTradingDays = Number(participant.challenge_trading_days) || 0
          let nextDayStart = Number(participant.challenge_day_start_equity) || plan?.startingBalance || 0
          let currentEquity: number | null = null
          if (plan && participant.challenge_status === "active") {
            const remainingTradesResult = await client.query(
              `SELECT pair, direction, lot_size, open_price FROM forex_trades
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
              [participant_email],
            )
            const remainingTrades = remainingTradesResult.rows
            const remainingPnl = getChallengeOpenPositionPnl(remainingTrades, challengeRates)
            const remainingMarginResult = await client.query(
              `SELECT COALESCE(SUM(margin), 0) AS amount FROM forex_trades
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
              [participant_email],
            )
            const remainingMargin = Number(remainingMarginResult.rows[0]?.amount) || 0
            const today = utcDateKey()
            const isNewTradingDay = String(participant.challenge_last_trading_date || "").slice(0, 10) !== today
            nextTradingDays += isNewTradingDay ? 1 : 0
            nextDayStart = isNewTradingDay ? equityBefore : nextDayStart
            currentEquity = Number((balanceAfter + remainingMargin + (remainingPnl.complete ? remainingPnl.pnl : 0)).toFixed(2))
            const snapshot = getChallengeSnapshot(plan, currentEquity, nextDayStart, nextTradingDays, "active")
            challengeStatus = snapshot.breached
              ? "failed"
              : snapshot.eligibleToPass && remainingTrades.length === 0
                ? "passed"
                : "active"
            await client.query(
              `UPDATE participants SET account_balance = $1, challenge_status = $2,
                 challenge_failed_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE challenge_failed_at END,
                 challenge_passed_at = CASE WHEN $2 = 'passed' THEN NOW() ELSE challenge_passed_at END,
                 challenge_day_start_equity = $3, challenge_trading_days = $4,
                 challenge_last_trading_date = $5::date,
                 challenge_peak_equity = GREATEST(COALESCE(challenge_peak_equity, $6), $6), updated_at = NOW()
               WHERE id = $7`,
              [balanceAfter, challengeStatus, nextDayStart, nextTradingDays, today, Math.max(Number(participant.challenge_peak_equity) || 0, currentEquity), participant.id],
            )
            if (challengeStatus !== "active") {
              await client.query(
                `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
                 WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
                [participant_email],
              )
            }
          } else {
            await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [balanceAfter, participant.id])
          }
          await client.query(
            `INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
            [participant.id, participant_email, settlement < 0 ? "forex_pnl_loss" : "forex_pnl_profit", Math.abs(settlement), `Partial trade close settlement — ${id}`, balanceBefore, balanceAfter],
          )
          await client.query("COMMIT")
          return NextResponse.json({
            success: true,
            newBalance: balanceAfter,
            settlement,
            finalPnl: calculated.pnl,
            finalPips: calculated.pips,
            closePrice: executionPrice,
            challengeStatus,
            challengeEquity: currentEquity,
          })
        }

        const parentUpdate = await client.query(
          `UPDATE forex_trades
           SET lot_size = $1, margin = $2, updated_at = NOW()
           WHERE id = $3 AND LOWER(participant_email) = LOWER($4) AND status = 'open'`,
          [remainingLotSize, remainingMargin, sourceTradeId, participant_email],
        )
        if (parentUpdate.rowCount !== 1) {
          await client.query("ROLLBACK")
          return NextResponse.json({ success: false, error: "Open trade was not found or is already closed" }, { status: 409 })
        }

        const insertedClose = await client.query(
          `INSERT INTO forex_trades
             (id, participant_id, participant_email, pair, direction, lot_size, leverage,
              open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
              close_price, close_reason, final_pnl, final_pips, final_swap,
              status, open_time, open_timestamp, close_time, close_duration)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'closed',$20,$21,$22,$23)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [
            trade.id, participantId, participant_email, trade.pair, trade.direction,
            trade.lotSize, trade.leverage, trade.openPrice, trade.sl, trade.tp,
            trade.trailingStopPips, trade.trailingPeak, trade.margin, trade.finalSwap,
            trade.closePrice, trade.closeReason, trade.finalPnl, trade.finalPips, trade.finalSwap,
            trade.openTime, trade.openTimestamp, trade.closeTime, trade.closeDuration,
          ]
        )
        if (insertedClose.rowCount !== 1) {
          await client.query("ROLLBACK")
          const existing = await db.query(
            "SELECT participant_email, status FROM forex_trades WHERE id = $1",
            [trade.id],
          )
          if (existing.rows[0]?.participant_email?.toLowerCase() === participant_email.toLowerCase() && existing.rows[0]?.status === "closed") {
            return NextResponse.json({ success: true, alreadySaved: true })
          }
          return NextResponse.json({ success: false, error: "Trade ID already exists" }, { status: 409 })
        }
        await client.query("COMMIT")
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } else {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }

    await recordTradeRiskFlags(participant_email, String(trade.id), tradeRisk)
    await recordSecurityEvent({
      eventType: `trade_${action}`,
      actorType: "participant",
      actorEmail: participant_email,
      request: req,
      resourceType: "forex_trade",
      resourceId: String(trade.id),
      riskScore: tradeRisk.riskScore,
      metadata: { flags: tradeRisk.flags, participantId },
    })
    return NextResponse.json({
      success: true,
      execution: {
        id: String(trade.id),
        status: action === "open" ? "accepted" : action === "pending" ? "working" : "recorded",
        serverTimestamp: new Date().toISOString(),
      },
      riskFlags: tradeRisk.flags,
    })
  } catch (e: any) {
    console.error("[v0] forex trades POST error:", e)
    return NextResponse.json({ success: false, error: "Trade could not be executed. Please try again." }, { status: 500 })
  }
}

/**
 * PATCH /api/forex/trades
 * Body: { participant_email, id, action: "close" | "modify" | "fill", ...fields }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response
  const context = getSecurityContext(req)
  const rate = await enforceRateLimit("trade", `${auth.email}:${context.ipAddress || "unknown"}`)
  if (!rate.allowed) {
    await recordSecurityEvent({ eventType: "trade_update_rate_limited", actorType: "participant", actorEmail: auth.email, request: req, riskScore: 70 })
    return NextResponse.json({ success: false, error: "Trading request limit reached. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })
  }

  try {
    const body = await req.json()
    const { participant_email, id, action } = body
    const allowedActions = new Set(["close", "modify", "partial_reduce", "fill", "sync"])
    if (typeof participant_email !== "string" || !participant_email.trim() || typeof id !== "string" || !id || !allowedActions.has(action)) {
      return NextResponse.json({ success: false, error: "Invalid trade update" }, { status: 400 })
    }
    const numericUpdateFields = [body.closePrice, body.finalPnl, body.finalPips, body.finalSwap, body.lotSize, body.margin, body.sl, body.tp, body.trailingStopPips, body.openPrice].filter((value) => value !== undefined && value !== null)
    if (numericUpdateFields.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      return NextResponse.json({ success: false, error: "Invalid trade values" }, { status: 400 })
    }
    if (auth.email.toLowerCase() !== participant_email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const db = getPool()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })
    const accountRuleResult = await db.query(
      "SELECT account_type, challenge_status FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [participant_email],
    )
    const isChallengeAccount = accountRuleResult.rows[0]?.account_type === "challenge"
    if (isChallengeAccount && action !== "close" && action !== "sync" && accountRuleResult.rows[0]?.challenge_status !== "active") {
      return NextResponse.json({ success: false, error: "Challenge trading is not active." }, { status: 403 })
    }
    if (isChallengeAccount && action === "partial_reduce") {
      return NextResponse.json({ success: false, error: "Use the verified partial-close flow to reduce Challenge positions." }, { status: 403 })
    }

    if (action === "close") {
      const { closePrice, closeTime, closeDuration, finalPnl, finalPips, finalSwap, closeReason, lotSize, margin } = body
      const closeValues = [closePrice, finalPnl, finalPips, finalSwap].map(Number)
      if (closeValues.some((value) => !Number.isFinite(value))) {
        return NextResponse.json({ success: false, error: "Invalid close calculation" }, { status: 400 })
      }

      const accountTypeResult = await db.query(
        "SELECT account_type FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [participant_email],
      )
      const isChallengeAccount = accountTypeResult.rows[0]?.account_type === "challenge"
      const challengeRates = isChallengeAccount ? await getLiveChallengeRates(req.nextUrl.origin) : null
      if (isChallengeAccount && !challengeRates) {
        return NextResponse.json({ success: false, error: "A fresh server-side market quote is required to close Challenge trades." }, { status: 503 })
      }

      const client = await db.connect()
      try {
        await client.query("BEGIN")
        const existingTrade = await client.query(
          `SELECT participant_id, participant_email, pair, direction, lot_size, leverage,
                  open_price, margin, status
           FROM forex_trades
           WHERE id = $1 AND LOWER(participant_email) = LOWER($2)
           FOR UPDATE`,
          [id, participant_email],
        )
        const currentTrade = existingTrade.rows[0]
        if (!currentTrade) {
          await client.query("ROLLBACK")
          return NextResponse.json({ success: false, error: "Trade was not found" }, { status: 404 })
        }
        if (currentTrade.status === "closed") {
          await client.query("ROLLBACK")
          return NextResponse.json({ success: true, alreadyClosed: true })
        }
        if (currentTrade.status !== "open") {
          await client.query("ROLLBACK")
          return NextResponse.json({ success: false, error: "Trade is not open" }, { status: 409 })
        }

        const actualClosePrice = isChallengeAccount
          ? getChallengeExecutionPrice(challengeRates, currentTrade.pair, currentTrade.direction, true)
          : Number(closePrice)
        if (actualClosePrice === null || !Number.isFinite(actualClosePrice)) {
          await client.query("ROLLBACK")
          return NextResponse.json({ success: false, error: "A current quote is unavailable for this instrument." }, { status: 503 })
        }
        const actualPnl = isChallengeAccount
          ? calculateChallengePnl(currentTrade.pair, currentTrade.direction, Number(currentTrade.lot_size), Number(currentTrade.open_price), actualClosePrice).pnl
          : Number(finalPnl)
        const actualPips = isChallengeAccount
          ? calculateChallengePnl(currentTrade.pair, currentTrade.direction, Number(currentTrade.lot_size), Number(currentTrade.open_price), actualClosePrice).pips
          : Number(finalPips)
        const actualSwap = isChallengeAccount ? 0 : Number(finalSwap)
        const actualMargin = Number(currentTrade.margin)
        const serverCloseTime = isChallengeAccount ? new Date().toISOString() : closeTime

        const result = await client.query(
          `UPDATE forex_trades
             SET status = 'closed', close_price = $1, close_time = $2, close_duration = $3,
                 final_pnl = $4, final_pips = $5, final_swap = $6, close_reason = $7,
                 lot_size = $8, margin = $9, updated_at = NOW()
           WHERE id = $10 AND status = 'open'`,
          [actualClosePrice, serverCloseTime, closeDuration, actualPnl, actualPips, actualSwap, closeReason, currentTrade.lot_size, actualMargin, id],
        )
        if (result.rowCount !== 1) throw new Error("Trade close could not be saved")

        const settlement = Number((actualMargin + actualPnl).toFixed(2))
        const participantResult = await client.query(
          `SELECT id, account_balance, account_type, challenge_status, challenge_plan_key,
                  challenge_trading_days, challenge_last_trading_date,
                  challenge_day_start_equity, challenge_peak_equity
           FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
          [participant_email],
        )
        const participant = participantResult.rows[0]
        if (!participant) throw new Error("Participant account was not found")
        const balanceBefore = Number(participant.account_balance) || 0
        const balanceAfter = Number((balanceBefore + settlement).toFixed(2))
        if (balanceAfter < 0 && !isChallengeAccount) throw new Error("Insufficient balance for trade settlement")

        let challengeStatus = participant.challenge_status
        let challengeEquity: number | null = null
        if (isChallengeAccount && participant.challenge_status === "active") {
          const plan = getChallengePlan(participant.challenge_plan_key)
          if (plan) {
            const remainingTradesResult = await client.query(
              `SELECT pair, direction, lot_size, open_price FROM forex_trades
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
              [participant_email],
            )
            const remainingTrades = remainingTradesResult.rows
            const remainingPnl = getChallengeOpenPositionPnl(remainingTrades, challengeRates)
            const remainingMarginResult = await client.query(
              `SELECT COALESCE(SUM(margin), 0) AS amount FROM forex_trades
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
              [participant_email],
            )
            const remainingMargin = Number(remainingMarginResult.rows[0]?.amount) || 0
            const equityBefore = Number((balanceBefore + actualMargin + remainingMargin + (remainingPnl.complete ? remainingPnl.pnl : 0)).toFixed(2))
            const today = utcDateKey()
            const lastTradingDate = String(participant.challenge_last_trading_date || "").slice(0, 10)
            const isNewTradingDay = lastTradingDate !== today
            const dayStartEquity = isNewTradingDay
              ? equityBefore
              : Number(participant.challenge_day_start_equity) || plan.startingBalance
            const tradingDays = (Number(participant.challenge_trading_days) || 0) + (isNewTradingDay ? 1 : 0)
            challengeEquity = Number((balanceAfter + remainingMargin + (remainingPnl.complete ? remainingPnl.pnl : 0)).toFixed(2))
            const snapshot = getChallengeSnapshot(plan, challengeEquity, dayStartEquity, tradingDays, "active")
            challengeStatus = snapshot.breached
              ? "failed"
              : snapshot.eligibleToPass && remainingTrades.length === 0
                ? "passed"
                : "active"

            await client.query(
              `UPDATE participants SET account_balance = $1, challenge_status = $2,
                 challenge_failed_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE challenge_failed_at END,
                 challenge_passed_at = CASE WHEN $2 = 'passed' THEN NOW() ELSE challenge_passed_at END,
                 challenge_day_start_equity = $3, challenge_trading_days = $4,
                 challenge_last_trading_date = $5::date,
                 challenge_peak_equity = GREATEST(COALESCE(challenge_peak_equity, $6), $6), updated_at = NOW()
               WHERE id = $7`,
              [balanceAfter, challengeStatus, dayStartEquity, tradingDays, today, Math.max(Number(participant.challenge_peak_equity) || 0, challengeEquity), participant.id],
            )
            if (challengeStatus !== "active") {
              await client.query(
                `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
                 WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
                [participant_email],
              )
            }
          } else {
            await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [balanceAfter, participant.id])
          }
        } else {
          await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [balanceAfter, participant.id])
        }

        await client.query(
          `INSERT INTO transactions
             (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
          [participant.id, participant_email, settlement < 0 ? "forex_pnl_loss" : "forex_pnl_profit", Math.abs(settlement), `Trade close settlement — ${id}`, balanceBefore, balanceAfter],
        )
        await client.query("COMMIT")
        return NextResponse.json({
          success: true,
          newBalance: balanceAfter,
          settlement,
          finalPnl: actualPnl,
          finalPips: actualPips,
          closePrice: actualClosePrice,
          challengeStatus,
          challengeEquity,
        })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } else if (action === "modify") {
      const { sl, tp, trailingStopPips } = body
      const current = await db.query("SELECT direction, open_price FROM forex_trades WHERE id = $1 AND LOWER(participant_email) = LOWER($2) AND status = 'open'", [id, participant_email])
      if (!current.rows[0]) return NextResponse.json({ success: false, error: "Open trade not found" }, { status: 404 })
      const entry = Number(current.rows[0].open_price)
      const direction = current.rows[0].direction
      const validSl = sl === null || sl === undefined || (Number.isFinite(Number(sl)) && (direction === "BUY" ? Number(sl) < entry : Number(sl) > entry))
      const validTp = tp === null || tp === undefined || (Number.isFinite(Number(tp)) && (direction === "BUY" ? Number(tp) > entry : Number(tp) < entry))
      if (!validSl || !validTp) return NextResponse.json({ success: false, error: "Stop loss and take profit must be valid for the trade direction" }, { status: 400 })
      const result = await db.query(
        `UPDATE forex_trades SET sl = $1, tp = $2, trailing_stop_pips = $3, updated_at = NOW()
         WHERE id = $4 AND LOWER(participant_email) = LOWER($5) AND status = 'open'`,
        [sl, tp, trailingStopPips, id, participant_email]
      )
      if (result.rowCount !== 1) return NextResponse.json({ success: false, error: "Open trade not found" }, { status: 404 })
    } else if (action === "partial_reduce") {
      const { lotSize, margin } = body
      const result = await db.query(
        `UPDATE forex_trades SET lot_size = $1, margin = $2, updated_at = NOW()
         WHERE id = $3 AND LOWER(participant_email) = LOWER($4) AND status = 'open'`,
        [lotSize, margin, id, participant_email]
      )
      if (result.rowCount !== 1) return NextResponse.json({ success: false, error: "Open trade not found" }, { status: 404 })
    } else if (action === "fill") {
      const { openPrice, openTime, openTimestamp } = body
      const accountTypeResult = await db.query(
        `SELECT account_type, challenge_status, challenge_plan_key
         FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [participant_email],
      )
      const isChallengeAccount = accountTypeResult.rows[0]?.account_type === "challenge"
      if (isChallengeAccount) {
        const plan = getChallengePlan(accountTypeResult.rows[0]?.challenge_plan_key)
        if (accountTypeResult.rows[0]?.challenge_status !== "active" || !plan) {
          return NextResponse.json({ success: false, error: "Challenge trading is not active." }, { status: 403 })
        }
        const rates = await getLiveChallengeRates(req.nextUrl.origin)
        if (!rates) return NextResponse.json({ success: false, error: "A fresh server-side market quote is required to fill Challenge orders." }, { status: 503 })

        const client = await db.connect()
        try {
          await client.query("BEGIN")
          const pendingResult = await client.query(
            `SELECT id, pair, direction, lot_size, leverage, status FROM forex_trades
             WHERE id = $1 AND LOWER(participant_email) = LOWER($2) FOR UPDATE`,
            [id, participant_email],
          )
          const pending = pendingResult.rows[0]
          if (!pending || pending.status !== "pending") {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Pending order not found" }, { status: 404 })
          }
          const participantResult = await client.query(
            `SELECT id, account_balance, account_type, challenge_status, challenge_plan_key,
                    challenge_trading_days, challenge_last_trading_date, challenge_day_start_equity,
                    challenge_peak_equity
             FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
            [participant_email],
          )
          const participant = participantResult.rows[0]
          if (!participant || participant.account_type !== "challenge" || participant.challenge_status !== "active") {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Challenge trading is not active." }, { status: 403 })
          }
          const challengePlan = getChallengePlan(participant.challenge_plan_key)
          if (!challengePlan || Number(pending.leverage) > challengePlan.leverage) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Challenge leverage limit exceeded." }, { status: 400 })
          }
          const executionPrice = getChallengeExecutionPrice(rates, pending.pair, pending.direction)
          if (executionPrice === null) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "A current quote is unavailable for this instrument." }, { status: 503 })
          }
          const margin = calculateChallengeMargin(pending.pair, Number(pending.lot_size), executionPrice, Number(pending.leverage))
          const balanceBefore = Number(participant.account_balance) || 0
          if (balanceBefore < margin) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Insufficient balance to fill this Challenge order." }, { status: 400 })
          }
          const openPositionsResult = await client.query(
            `SELECT pair, direction, lot_size, open_price FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const openPnl = getChallengeOpenPositionPnl(openPositionsResult.rows, rates)
          if (!openPnl.complete) {
            await client.query("ROLLBACK")
            return NextResponse.json({ success: false, error: "Quotes are unavailable for your open Challenge positions." }, { status: 503 })
          }
          const openMarginResult = await client.query(
            `SELECT COALESCE(SUM(margin), 0) AS amount FROM forex_trades
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'open'`,
            [participant_email],
          )
          const openMargin = Number(openMarginResult.rows[0]?.amount) || 0
          const equityBefore = Number((balanceBefore + openMargin + openPnl.pnl).toFixed(2))
          const today = utcDateKey()
          const lastTradingDate = String(participant.challenge_last_trading_date || "").slice(0, 10)
          const isNewTradingDay = lastTradingDate !== today
          const dayStartEquity = isNewTradingDay
            ? equityBefore
            : Number(participant.challenge_day_start_equity) || challengePlan.startingBalance
          const tradingDays = (Number(participant.challenge_trading_days) || 0) + (isNewTradingDay ? 1 : 0)
          const snapshot = getChallengeSnapshot(challengePlan, equityBefore, dayStartEquity, tradingDays, "active")
          if (snapshot.breached) {
            await client.query(
              `UPDATE participants SET challenge_status = 'failed', challenge_failed_at = NOW(), updated_at = NOW()
               WHERE id = $1`,
              [participant.id],
            )
            await client.query(
              `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
               WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
              [participant_email],
            )
            await client.query("COMMIT")
            return NextResponse.json({ success: false, error: "Challenge loss limit reached. The evaluation is now failed." }, { status: 403 })
          }

          const updated = await client.query(
            `UPDATE forex_trades SET status = 'open', open_price = $1, trailing_peak = $1,
               margin = $2, open_time = $3, open_timestamp = $4, updated_at = NOW()
             WHERE id = $5 AND status = 'pending' RETURNING id`,
            [executionPrice, margin, new Date().toISOString(), Date.now(), id],
          )
          if (!updated.rowCount) throw new Error("Pending order could not be filled")
          const balanceAfter = Number((balanceBefore - margin).toFixed(2))
          await client.query(
            `UPDATE participants SET account_balance = $1, challenge_day_start_equity = $2,
               challenge_trading_days = $3, challenge_last_trading_date = $4::date,
               challenge_peak_equity = GREATEST(COALESCE(challenge_peak_equity, $5), $5), updated_at = NOW()
             WHERE id = $6`,
            [balanceAfter, dayStartEquity, tradingDays, today, equityBefore, participant.id],
          )
          await client.query(
            `INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
             VALUES ($1, $2, 'forex_margin_lock', $3, $4, $5, $6, 'completed')`,
            [participant.id, participant_email, margin, `Margin locked — ${pending.pair} ${pending.direction} — ${id}`, balanceBefore, balanceAfter],
          )
          await client.query("COMMIT")
          return NextResponse.json({ success: true, newBalance: balanceAfter, execution: { price: executionPrice, margin } })
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        } finally {
          client.release()
        }
      }
      const result = await db.query(
        `UPDATE forex_trades
           SET status = 'open', open_price = $1, trailing_peak = $1, open_time = $2, open_timestamp = $3, updated_at = NOW()
         WHERE id = $4 AND LOWER(participant_email) = LOWER($5) AND status = 'pending'`,
        [openPrice, openTime, openTimestamp, id, participant_email]
      )
      if (result.rowCount !== 1) return NextResponse.json({ success: false, error: "Pending order not found" }, { status: 404 })
    } else if (action === "sync") {
      // Lightweight periodic sync of live pnl/price fields — non-critical, best-effort.
      const { currentPrice, pnl, pips, swap } = body
      const result = await db.query(
        `UPDATE forex_trades SET swap = $1, updated_at = NOW() WHERE id = $2 AND LOWER(participant_email) = LOWER($3) AND status = 'open'`,
        [isChallengeAccount ? 0 : (swap ?? 0), id, participant_email]
      )
      if (result.rowCount !== 1) return NextResponse.json({ success: false, error: "Open trade not found" }, { status: 404 })
    } else {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }

    await recordSecurityEvent({
      eventType: `trade_${action}`,
      actorType: "participant",
      actorEmail: participant_email,
      request: req,
      resourceType: "forex_trade",
      resourceId: id,
      metadata: { fields: Object.keys(body).filter((key) => key !== "participant_email") },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[v0] forex trades PATCH error:", e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/forex/trades?id=...&email=...
 * Cancels a pending order while preserving its audit history.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response
  const context = getSecurityContext(req)
  const rate = await enforceRateLimit("trade", `${auth.email}:${context.ipAddress || "unknown"}`)
  if (!rate.allowed) return NextResponse.json({ success: false, error: "Trading request limit reached. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const email = searchParams.get("email")
  if (!id || !email) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
  if (auth.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = getPool()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

  try {
    const result = await db.query(
      `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', close_time = NOW(), updated_at = NOW()
       WHERE id = $1 AND LOWER(participant_email) = LOWER($2) AND status = 'pending'`,
      [id, email],
    )
    if (result.rowCount !== 1) {
      const existing = await db.query(
        "SELECT status FROM forex_trades WHERE id = $1 AND LOWER(participant_email) = LOWER($2)",
        [id, email],
      )
      if (existing.rows[0]?.status !== "cancelled") {
        return NextResponse.json({ success: false, error: "Pending order not found" }, { status: 404 })
      }
    }
    await recordSecurityEvent({ eventType: "trade_cancelled", actorType: "participant", actorEmail: email, request: req, resourceType: "forex_trade", resourceId: id, metadata: { updated: result.rowCount === 1 } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ─── Row mappers: DB snake_case → frontend camelCase shape ──────��──────────

function toOpenTrade(r: any) {
  return {
    id: r.id, pair: r.pair, direction: r.direction,
    lotSize: Number(r.lot_size), leverage: Number(r.leverage),
    openPrice: Number(r.open_price), currentPrice: Number(r.open_price),
    sl: r.sl !== null ? Number(r.sl) : null, tp: r.tp !== null ? Number(r.tp) : null,
    trailingStopPips: r.trailing_stop_pips !== null ? Number(r.trailing_stop_pips) : null,
    trailingPeak: Number(r.trailing_peak ?? r.open_price),
    openTime: r.open_time, openTimestamp: Number(r.open_timestamp),
    pnl: 0, pips: 0, margin: Number(r.margin), returnOnMargin: 0, swap: Number(r.swap),
  }
}

function toPendingOrder(r: any) {
  return {
    id: r.id, pair: r.pair, direction: r.direction,
    orderType: r.order_type, lotSize: Number(r.lot_size), leverage: Number(r.leverage),
    targetPrice: Number(r.target_price), sl: r.sl !== null ? Number(r.sl) : null, tp: r.tp !== null ? Number(r.tp) : null,
    createdTime: r.open_time, expiry: r.expiry ?? "GTC",
  }
}

function toClosedTrade(r: any) {
  return {
    ...toOpenTrade(r),
    closePrice: r.close_price !== null ? Number(r.close_price) : Number(r.open_price),
    closeTime: r.close_time ?? r.updated_at ?? r.created_at,
    closeDuration: r.close_duration ?? "—",
    finalPnl: Number.isFinite(Number(r.final_pnl)) ? Number(r.final_pnl) : 0,
    finalPips: Number.isFinite(Number(r.final_pips)) ? Number(r.final_pips) : 0,
    finalSwap: Number.isFinite(Number(r.final_swap)) ? Number(r.final_swap) : 0,
    closeReason: r.close_reason,
  }
}
