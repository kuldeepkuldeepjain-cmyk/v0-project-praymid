import { NextRequest, NextResponse } from "next/server"
import { getPool, query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const [summaryRows, accounts, positions, performanceRows, riskFlags, payouts, payments, kyc, users, auditLogs, accountTypes, history] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*)::int FROM participants WHERE is_deleted IS NOT TRUE) AS participant_count,
          (SELECT COUNT(*)::int FROM participants WHERE is_deleted IS NOT TRUE AND LOWER(REGEXP_REPLACE(COALESCE(account_type, ''), '[ _-]', '', 'g')) IN ('funded', 'fundedaccount', 'fundedtier')) AS funded_accounts,
          (SELECT COALESCE(SUM(funded_initial_balance), 0) FROM participants WHERE is_deleted IS NOT TRUE AND funded_initial_balance > 0) AS funded_capital,
          (SELECT COUNT(*)::int FROM participants WHERE is_deleted IS NOT TRUE AND (is_frozen IS TRUE OR account_frozen IS TRUE)) AS frozen_accounts,
          (SELECT COUNT(*)::int FROM participants WHERE is_deleted IS NOT TRUE AND funded_initial_balance > 0 AND (funded_breach_status = 'breached' OR account_balance <= funded_initial_balance * 0.98)) AS breached_accounts,
          (SELECT COUNT(*)::int FROM forex_trades WHERE status = 'open') AS open_positions,
          (SELECT COUNT(*)::int FROM forex_trades WHERE status = 'pending') AS pending_orders,
          (SELECT COALESCE(SUM(margin), 0) FROM forex_trades WHERE status = 'open') AS used_margin,
          (SELECT COUNT(*)::int FROM trade_risk_flags WHERE status = 'open') AS open_risk_flags,
          (SELECT COUNT(*)::int FROM payout_requests WHERE status IN ('pending', 'matched', 'approved')) AS pending_payouts,
          (SELECT COUNT(*)::int FROM participant_kyc_verifications WHERE status IN ('pending', 'under_review')) AS pending_kyc
      `),
      query(`
        SELECT p.id::text AS id, p.email, COALESCE(NULLIF(p.full_name, ''), NULLIF(p.username, ''), p.email) AS trader,
               p.serial_number, COALESCE(p.account_type, 'unassigned') AS account_type,
               COALESCE(p.account_balance, 0) AS account_balance, COALESCE(p.funded_initial_balance, 0) AS funded_initial_balance,
               COALESCE(p.is_active, false) AS is_active,
               (COALESCE(p.is_frozen, false) OR COALESCE(p.account_frozen, false)) AS frozen,
               COALESCE(p.funded_breach_status, 'clear') AS funded_breach_status,
               COALESCE(t.open_positions, 0)::int AS open_positions,
               COALESCE(t.pending_orders, 0)::int AS pending_orders,
               COALESCE(t.trade_count, 0)::int AS trade_count
        FROM participants p
        LEFT JOIN (
          SELECT LOWER(participant_email) AS email,
                 COUNT(*) FILTER (WHERE status = 'open')::int AS open_positions,
                 COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
                 COUNT(*)::int AS trade_count
          FROM forex_trades GROUP BY LOWER(participant_email)
        ) t ON t.email = LOWER(p.email)
        WHERE p.is_deleted IS NOT TRUE AND (
          LOWER(REGEXP_REPLACE(COALESCE(p.account_type, ''), '[ _-]', '', 'g')) IN ('funded', 'fundedaccount', 'fundedtier') OR COALESCE(t.trade_count, 0) > 0
        )
        ORDER BY COALESCE(t.open_positions, 0) DESC, p.created_at DESC LIMIT 250
      `),
      query(`
        SELECT t.id, t.participant_email, COALESCE(NULLIF(p.full_name, ''), NULLIF(p.username, ''), t.participant_email) AS trader,
               t.pair, t.direction, t.status, t.lot_size, t.leverage, t.open_price, t.target_price, t.sl, t.tp, t.margin, t.swap,
               t.open_time, t.created_at, t.updated_at
        FROM forex_trades t
        LEFT JOIN participants p ON LOWER(p.email) = LOWER(t.participant_email)
        WHERE t.status IN ('open', 'pending')
        ORDER BY COALESCE(t.updated_at, t.created_at) DESC LIMIT 250
      `),
      query(`
        SELECT COUNT(*)::int AS trades,
               COUNT(*) FILTER (WHERE final_pnl > 0)::int AS wins,
               COUNT(*) FILTER (WHERE final_pnl < 0)::int AS losses,
               COALESCE(SUM(final_pnl) FILTER (WHERE final_pnl > 0), 0) AS gross_profit,
               COALESCE(SUM(ABS(final_pnl)) FILTER (WHERE final_pnl < 0), 0) AS gross_loss,
               COALESCE(SUM(final_pnl), 0) AS net_pnl,
               COALESCE(AVG(final_pnl), 0) AS average_pnl,
               COALESCE(AVG(final_pnl) FILTER (WHERE final_pnl > 0), 0) AS average_win,
               COALESCE(AVG(final_pnl) FILTER (WHERE final_pnl < 0), 0) AS average_loss
        FROM forex_trades
        WHERE status = 'closed' AND COALESCE(updated_at, created_at) >= NOW() - INTERVAL '30 days'
      `),
      query(`
        SELECT id::text AS id, trade_id, participant_email, flag_type, severity, evidence, status, created_at
        FROM trade_risk_flags WHERE status = 'open' ORDER BY created_at DESC LIMIT 100
      `),
      query(`
        SELECT pr.id::text AS id, pr.participant_email, COALESCE(NULLIF(p.full_name, ''), NULLIF(p.username, ''), pr.participant_email) AS trader,
               pr.amount, pr.payout_method, pr.status, pr.created_at
        FROM payout_requests pr LEFT JOIN participants p ON p.id = pr.participant_id
        ORDER BY pr.created_at DESC LIMIT 100
      `),
      query(`
  SELECT id::text AS id, participant_email, amount, payment_method, transaction_id, status, rejection_reason, created_at
  FROM payment_submissions ORDER BY created_at DESC LIMIT 100
      `),
      query(`
        SELECT id::text AS id, participant_email, legal_name, country, document_type, status, submitted_at, reviewed_at, reviewed_by
        FROM participant_kyc_verifications ORDER BY submitted_at DESC LIMIT 100
      `),
      query(`
        SELECT id::text AS id, email, COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), email) AS trader,
               account_type, account_balance, is_active, is_frozen, account_frozen, created_at, last_seen
        FROM participants WHERE is_deleted IS NOT TRUE ORDER BY created_at DESC LIMIT 250
      `),
      query(`
        SELECT id::text AS id, actor_email, action, target_type, target_id, details, created_at
        FROM activity_logs ORDER BY created_at DESC LIMIT 100
      `),
      query(`
        SELECT COALESCE(NULLIF(account_type, ''), 'unassigned') AS account_type,
               COUNT(*)::int AS accounts,
               COALESCE(SUM(account_balance), 0) AS account_balance,
               COALESCE(SUM(funded_initial_balance) FILTER (WHERE funded_initial_balance > 0), 0) AS funded_capital
        FROM participants WHERE is_deleted IS NOT TRUE GROUP BY COALESCE(NULLIF(account_type, ''), 'unassigned')
        ORDER BY accounts DESC
      `),
      query(`
        SELECT id, participant_email, pair, direction, lot_size, open_price, close_price, final_pnl, close_reason,
               close_time, COALESCE(updated_at, created_at) AS recorded_at
        FROM forex_trades WHERE status = 'closed'
        ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 100
      `),
    ])

    const performance = performanceRows[0] ?? {}
    const totalTrades = Number(performance.trades ?? 0)
    const grossProfit = Number(performance.gross_profit ?? 0)
    const grossLoss = Number(performance.gross_loss ?? 0)

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary: summaryRows[0] ?? {},
      accounts,
      positions,
      performance: {
        ...performance,
        win_rate: totalTrades ? (Number(performance.wins ?? 0) / totalTrades) * 100 : 0,
        profit_factor: grossLoss ? grossProfit / grossLoss : grossProfit ? null : 0,
      },
      riskFlags,
      payouts,
      payments,
      kyc,
      users,
      auditLogs,
      accountTypes,
      history,
    })
  } catch (error) {
    console.error("[admin/trading-control-room] failed to load live trading data", error)
    return NextResponse.json({ success: false, error: "Live trading data is currently unavailable." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  let body: { action?: unknown; verificationId?: unknown; flagId?: unknown; payoutId?: unknown; paymentId?: unknown; email?: unknown; status?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : ""
  const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isUuid = (value: unknown): value is string => typeof value === "string" && idPattern.test(value)
  const validAction = action === "close-trades"
    ? typeof body.email === "string" && body.email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    : action === "review-risk-flag"
      ? isUuid(body.flagId) && ["reviewed", "dismissed"].includes(String(body.status))
      : action === "mark-payout-processing"
        ? isUuid(body.payoutId)
        : action === "reject-payment"
          ? isUuid(body.paymentId) && typeof body.reason === "string" && body.reason.trim().length >= 5 && body.reason.trim().length <= 500
          : action === "review-kyc"
          ? isUuid(body.verificationId) && ["under_review", "approved"].includes(String(body.status))
          : false
  if (!validAction) return NextResponse.json({ success: false, error: "Invalid control-room action." }, { status: 400 })

  const pool = getPool()
  if (!pool) return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 })

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    let targetType = ""
    let targetId = ""
    let actionName = ""
    let details = ""
    let closedCount = 0

    if (action === "close-trades") {
      const email = (body.email as string).trim().toLowerCase()
      const closed = await client.query(
        `UPDATE forex_trades
         SET status = 'closed', close_price = open_price, final_pnl = 0, final_pips = 0,
             final_swap = COALESCE(swap, 0), close_reason = 'manual', close_time = NOW()::text,
             close_duration = 'admin force close', updated_at = NOW()
         WHERE LOWER(participant_email) = $1 AND status = 'open' RETURNING id`,
        [email],
      )
      closedCount = closed.rowCount ?? 0
      targetType = "forex_trade"
      targetId = email
      actionName = "admin_force_close_trades"
      details = `Force-closed ${closedCount} running ledger trade(s) for ${email} at stored entry price with zero realized P&L`
    } else if (action === "review-risk-flag") {
      const flagId = body.flagId as string
      const result = await client.query(
        `UPDATE trade_risk_flags SET status = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $3 AND status = 'open' RETURNING id`,
        [body.status, auth.email, flagId],
      )
      if (!result.rowCount) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Open risk flag not found." }, { status: 404 })
      }
      targetType = "trade_risk_flag"
      targetId = flagId
      actionName = "risk_flag_reviewed"
      details = `Risk flag marked ${String(body.status)} by ${auth.email}`
    } else if (action === "reject-payment") {
      const paymentId = body.paymentId as string
      const reason = (body.reason as string).trim()
      const payment = await client.query("SELECT id, participant_email, status FROM payment_submissions WHERE id = $1 FOR UPDATE", [paymentId])
      if (!payment.rows[0]) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Payment submission not found." }, { status: 404 })
      }
      if (!["pending", "under_review"].includes(String(payment.rows[0].status))) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "This payment has already been finalized." }, { status: 409 })
      }
      await client.query(
        `UPDATE payment_submissions SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [reason, paymentId],
      )
      targetType = "payment_submission"
      targetId = paymentId
      actionName = "payment_rejected"
      details = `Payment rejected for ${payment.rows[0].participant_email}: ${reason}`
    } else if (action === "mark-payout-processing") {
      const payoutId = body.payoutId as string
      const result = await client.query("SELECT id, status FROM payout_requests WHERE id = $1 FOR UPDATE", [payoutId])
      const payout = result.rows[0]
      if (!payout) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Payout request not found." }, { status: 404 })
      }
      if (!["pending", "matched", "approved"].includes(String(payout.status))) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Only pending payout requests can be moved to processing." }, { status: 409 })
      }
      await client.query(
        `UPDATE payout_requests SET status = 'processing', processed_at = COALESCE(processed_at, NOW()), updated_at = NOW()
         WHERE id = $1`,
        [payoutId],
      )
      targetType = "payout"
      targetId = payoutId
      actionName = "payout_marked_processing"
      details = `Payout request moved from ${payout.status} to processing; no funds were transferred`
    } else {
      const verificationId = body.verificationId as string
      const current = await client.query(
        "SELECT id, status FROM participant_kyc_verifications WHERE id = $1 FOR UPDATE",
        [verificationId],
      )
      if (!current.rows[0]) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "KYC record not found." }, { status: 404 })
      }
      if (!["pending", "under_review"].includes(current.rows[0].status)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "This KYC record has already been finalized." }, { status: 409 })
      }
      await client.query(
        `UPDATE participant_kyc_verifications
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [body.status, auth.email, verificationId],
      )
      targetType = "kyc_verification"
      targetId = verificationId
      actionName = `kyc_${String(body.status)}`
      details = `KYC record moved from ${current.rows[0].status} to ${String(body.status)}`
    }

    await client.query(
      `INSERT INTO activity_logs (actor_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [auth.email, actionName, targetType, targetId, details],
    )
    await client.query("COMMIT")
    return NextResponse.json({ success: true, closedCount })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[admin/trading-control-room] action failed", error)
    return NextResponse.json({ success: false, error: "Unable to complete the control-room action." }, { status: 500 })
  } finally {
    client.release()
  }
}

export const revalidate = 0
