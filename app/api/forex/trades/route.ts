import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { enforceRateLimit, getSecurityContext, inspectTradeRisk, recordSecurityEvent, recordTradeRiskFlags, updateParticipantSecurityProfile } from "@/lib/security"

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
  const email = searchParams.get("email")
  if (!email) return NextResponse.json({ success: false, error: "email is required" }, { status: 400 })
  if (auth.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = getPool()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

  try {
    const { rows } = await db.query(
      `SELECT * FROM forex_trades WHERE participant_email = $1 ORDER BY created_at DESC LIMIT 500`,
      [email]
    )

    const open = rows.filter((r: any) => r.status === "open").map(toOpenTrade)
    const pending = rows.filter((r: any) => r.status === "pending").map(toPendingOrder)
    const closed = rows.filter((r: any) => r.status === "closed").map(toClosedTrade).slice(0, 100)

    return NextResponse.json({ success: true, open, pending, closed })
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

  try {
    const body = await req.json()
    const { participant_email, action, trade } = body
    const allowedActions = new Set(["open", "pending", "partial_close", "sync"])
    if (typeof participant_email !== "string" || !participant_email.trim() || !allowedActions.has(action) || !trade?.id) {
      return NextResponse.json({ success: false, error: "Invalid trade request" }, { status: 400 })
    }
    const numericTradeFields = [trade.lotSize, trade.leverage, trade.openPrice, trade.margin].filter((value) => value !== undefined && value !== null)
    if (numericTradeFields.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      return NextResponse.json({ success: false, error: "Invalid trade values" }, { status: 400 })
    }
    if (auth.email.toLowerCase() !== participant_email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const db = getPool()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

    const participantRows = await db.query("SELECT id, account_frozen, is_frozen, account_type, funded_breach_status FROM participants WHERE email = $1", [participant_email])
    const participant = participantRows.rows[0]
    const participantId = participant?.id ?? null
    const tradeRisk = action === "open" || action === "pending"
      ? await inspectTradeRisk({ email: participant_email, trade })
      : { riskScore: 0, flags: [] as string[] }
    const securityProfile = await updateParticipantSecurityProfile(participant_email, req, tradeRisk.riskScore)
    if (securityProfile.duplicateAccountCount > 0) {
      tradeRisk.flags.push("duplicate_account_signal")
      tradeRisk.riskScore = Math.max(tradeRisk.riskScore, 60)
    }
    if (tradeRisk.riskScore >= 100 && action !== "sync") {
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
      await db.query(
        `INSERT INTO forex_trades
           (id, participant_id, participant_email, pair, direction, lot_size, leverage,
            open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
            status, open_time, open_timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,'open',$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          trade.id, participantId, participant_email, trade.pair, trade.direction,
          trade.lotSize, trade.leverage, trade.openPrice, trade.sl, trade.tp,
          trade.trailingStopPips, trade.trailingPeak, trade.margin,
          trade.openTime, trade.openTimestamp,
        ]
      )
    } else if (action === "pending") {
      await db.query(
        `INSERT INTO forex_trades
           (id, participant_id, participant_email, pair, direction, lot_size, leverage,
            open_price, sl, tp, order_type, target_price, expiry, margin, swap,
            status, open_time, open_timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,'pending',$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          trade.id, participantId, participant_email, trade.pair, trade.direction,
          trade.lotSize, trade.leverage, trade.targetPrice, trade.sl, trade.tp,
          trade.orderType, trade.targetPrice, trade.expiry,
          trade.createdTime, Date.now(),
        ]
      )
    } else if (action === "partial_close") {
      await db.query(
        `INSERT INTO forex_trades
           (id, participant_id, participant_email, pair, direction, lot_size, leverage,
            open_price, sl, tp, trailing_stop_pips, trailing_peak, margin, swap,
            close_price, close_reason, final_pnl, final_pips, final_swap,
            status, open_time, open_timestamp, close_time, close_duration)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'closed',$20,$21,$22,$23)
         ON CONFLICT (id) DO NOTHING`,
        [
          trade.id, participantId, participant_email, trade.pair, trade.direction,
          trade.lotSize, trade.leverage, trade.openPrice, trade.sl, trade.tp,
          trade.trailingStopPips, trade.trailingPeak, trade.margin, trade.finalSwap,
          trade.closePrice, trade.closeReason, trade.finalPnl, trade.finalPips, trade.finalSwap,
          trade.openTime, trade.openTimestamp, trade.closeTime, trade.closeDuration,
        ]
      )
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
    return NextResponse.json({ success: true, riskFlags: tradeRisk.flags })
  } catch (e: any) {
    console.error("[v0] forex trades POST error:", e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
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

    if (action === "close") {
      const { closePrice, closeTime, closeDuration, finalPnl, finalPips, finalSwap, closeReason, lotSize, margin } = body
      await db.query(
        `UPDATE forex_trades
           SET status = 'closed', close_price = $1, close_time = $2, close_duration = $3,
               final_pnl = $4, final_pips = $5, final_swap = $6, close_reason = $7,
               lot_size = COALESCE($8, lot_size), margin = COALESCE($9, margin), updated_at = NOW()
         WHERE id = $10 AND participant_email = $11`,
        [closePrice, closeTime, closeDuration, finalPnl, finalPips, finalSwap, closeReason, lotSize ?? null, margin ?? null, id, participant_email]
      )
    } else if (action === "modify") {
      const { sl, tp, trailingStopPips } = body
      await db.query(
        `UPDATE forex_trades SET sl = $1, tp = $2, trailing_stop_pips = $3, updated_at = NOW()
         WHERE id = $4 AND participant_email = $5`,
        [sl, tp, trailingStopPips, id, participant_email]
      )
    } else if (action === "partial_reduce") {
      const { lotSize, margin } = body
      await db.query(
        `UPDATE forex_trades SET lot_size = $1, margin = $2, updated_at = NOW()
         WHERE id = $3 AND participant_email = $4`,
        [lotSize, margin, id, participant_email]
      )
    } else if (action === "fill") {
      const { openPrice, openTime, openTimestamp } = body
      await db.query(
        `UPDATE forex_trades
           SET status = 'open', open_price = $1, trailing_peak = $1, open_time = $2, open_timestamp = $3, updated_at = NOW()
         WHERE id = $4 AND participant_email = $5`,
        [openPrice, openTime, openTimestamp, id, participant_email]
      )
    } else if (action === "sync") {
      // Lightweight periodic sync of live pnl/price fields — non-critical, best-effort.
      const { currentPrice, pnl, pips, swap } = body
      await db.query(
        `UPDATE forex_trades SET swap = $1, updated_at = NOW() WHERE id = $2 AND participant_email = $3 AND status = 'open'`,
        [swap ?? 0, id, participant_email]
      )
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
 * Cancels a pending order (hard delete — it was never filled).
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
    await db.query(`DELETE FROM forex_trades WHERE id = $1 AND participant_email = $2 AND status = 'pending'`, [id, email])
    await recordSecurityEvent({ eventType: "trade_cancelled", actorType: "participant", actorEmail: email, request: req, resourceType: "forex_trade", resourceId: id })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ─── Row mappers: DB snake_case → frontend camelCase shape ─────────────────

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
    closePrice: Number(r.close_price), closeTime: r.close_time, closeDuration: r.close_duration,
    finalPnl: Number(r.final_pnl), finalPips: Number(r.final_pips), finalSwap: Number(r.final_swap),
    closeReason: r.close_reason,
  }
}
