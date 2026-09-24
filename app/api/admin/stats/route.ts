import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const [
      participantStats,
      otpPending,
      weekNew,
      monthNew,
      contributionStats,
      payoutStats,
      topupStats,
      predictionStats,
      balanceStats,
      tradingStats,
      openTradingStats,
      todayPnlStats,
    ] = await Promise.all([
      // Total + active participants
      query(`
        SELECT
          COUNT(*)::int                                                       AS total,
          COUNT(*) FILTER (WHERE is_active = true OR status = 'active')::int AS active
        FROM participants
        WHERE is_deleted IS NOT TRUE
      `),

      // OTP not yet verified
      query(`
        SELECT COUNT(*)::int AS count
        FROM participants
        WHERE (otp_verified = false OR otp_verified IS NULL)
          AND is_deleted IS NOT TRUE
      `),

      // New this week
      query(`
        SELECT COUNT(*)::int AS count
        FROM participants
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND is_deleted IS NOT TRUE
      `),

      // New this month
      query(`
        SELECT COUNT(*)::int AS count
        FROM participants
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND is_deleted IS NOT TRUE
      `),

      // Contributions (payment_submissions)
      query(`
        SELECT
          COUNT(*)::int                                                           AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int                        AS pending,
          COUNT(*) FILTER (WHERE status IN ('approved','matched'))::int           AS approved,
          COUNT(*) FILTER (WHERE status = 'in_process')::int                     AS in_process,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','matched')), 0) AS approved_amount,
          COALESCE(SUM(amount), 0)                                                AS total_amount
        FROM payment_submissions
      `),

      // Payout requests
      query(`
        SELECT
          COUNT(*)::int                                                             AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int                          AS pending,
          COUNT(*) FILTER (WHERE status = 'matched')::int                          AS matched,
          COUNT(*) FILTER (WHERE status IN ('completed','processed'))::int          AS completed,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('completed','processed')), 0) AS paid_amount,
          COALESCE(SUM(amount), 0)                                                  AS total_amount
        FROM payout_requests
      `),

      // Top-up requests
      query(`
        SELECT
          COUNT(*)::int                                                              AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int                           AS pending,
          COUNT(*) FILTER (WHERE status IN ('approved','completed'))::int            AS approved,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','completed')), 0) AS approved_amount
        FROM topup_requests
      `).catch(() => [{ total: 0, pending: 0, approved: 0, approved_amount: 0 }]),

      // Predictions
      query(`
        SELECT
          COUNT(*)::int                                                          AS total,
          COUNT(*) FILTER (WHERE status IN ('active','pending'))::int           AS active,
          COUNT(*) FILTER (WHERE status IN ('settled','completed','win','loss'))::int AS settled,
          COALESCE(SUM(profit_loss) FILTER (WHERE profit_loss > 0), 0)         AS total_profit
        FROM predictions
      `).catch(() => [{ total: 0, active: 0, settled: 0, total_profit: 0 }]),

      // Total platform balance across all participants
      query(`
        SELECT
          COALESCE(SUM(account_balance), 0) AS total_balance,
          COALESCE(AVG(account_balance), 0) AS avg_balance,
          COUNT(*) FILTER (WHERE account_balance > 0)::int AS positive_balance_count
        FROM participants
        WHERE is_deleted IS NOT TRUE
      `),

      // Trading account health and open positions. The forex table is optional in older deployments.
      query(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = true AND is_frozen IS NOT TRUE)::int AS active_traders,
          COUNT(*) FILTER (WHERE funded_initial_balance > 0 AND account_balance < funded_initial_balance AND is_frozen IS NOT TRUE)::int AS traders_in_drawdown,
          COUNT(*) FILTER (WHERE is_frozen = true)::int AS accounts_locked,
          COUNT(*) FILTER (WHERE funded_initial_balance > 0 AND account_balance < funded_initial_balance * 0.98)::int AS breached_accounts,
          COALESCE(SUM(funded_initial_balance) FILTER (WHERE funded_initial_balance > 0), 0) AS funded_capital,
          COALESCE(SUM(GREATEST(funded_initial_balance - account_balance, 0)) FILTER (WHERE funded_initial_balance > 0), 0) AS total_drawdown,
          COUNT(*) FILTER (WHERE funded_initial_balance > 0 AND account_balance < funded_initial_balance * 0.985)::int AS risk_alerts
        FROM participants
        WHERE is_deleted IS NOT TRUE
      `).catch(() => [{ active_traders: 0, traders_in_drawdown: 0, accounts_locked: 0, breached_accounts: 0, funded_capital: 0, total_drawdown: 0, risk_alerts: 0 }]),

      query(`
        SELECT
          COUNT(DISTINCT participant_email)::int AS currently_trading,
          COALESCE(SUM(final_pnl), 0) AS floating_pnl
        FROM forex_trades
        WHERE status = 'open'
      `).catch(() => [{ currently_trading: 0, floating_pnl: 0 }]),

      query(`
        SELECT COALESCE(SUM(final_pnl), 0) AS todays_pnl
        FROM forex_trades
        WHERE status = 'closed' AND close_time::timestamp >= CURRENT_DATE
      `).catch(() => [{ todays_pnl: 0 }]),
    ])

    const p   = participantStats[0]
    const c   = contributionStats[0]
    const pay = payoutStats[0]
    const top = topupStats[0]
    const pr  = predictionStats[0]
    const b   = balanceStats[0]
    const t   = tradingStats[0]
    const live = openTradingStats[0]
    const today = todayPnlStats[0]
    const total = p.total || 0

    return NextResponse.json({
      stats: {
        // Participants
        totalParticipants:    total,
        activeParticipants:   p.active || 0,
        pendingOtpVerification: otpPending[0]?.count || 0,
        newThisWeek:          weekNew[0]?.count || 0,
        newThisMonth:         monthNew[0]?.count || 0,
        activationRate:       total > 0 ? Math.round(((p.active || 0) / total) * 100) : 0,

        // Contributions
        totalContributions:     Number(c.total) || 0,
        pendingContributions:   Number(c.pending) || 0,
        inProcessContributions: Number(c.in_process) || 0,
        approvedContributions:  Number(c.approved) || 0,
        totalContributedAmount: Number(c.approved_amount) || 0,

        // Payouts
        totalPayouts:      Number(pay.total) || 0,
        pendingPayouts:    Number(pay.pending) || 0,
        matchedPayouts:    Number(pay.matched) || 0,
        completedPayouts:  Number(pay.completed) || 0,
        totalPayoutAmount: Number(pay.paid_amount) || 0,

        // Top-ups
        totalTopups:      Number(top.total) || 0,
        pendingTopups:    Number(top.pending) || 0,
        approvedTopups:   Number(top.approved) || 0,
        totalTopupAmount: Number(top.approved_amount) || 0,

        // Predictions
        totalPredictions:    Number(pr.total) || 0,
        activePredictions:   Number(pr.active) || 0,
        settledPredictions:  Number(pr.settled) || 0,
        totalPredictionProfit: Number(pr.total_profit) || 0,

        // Platform balance
        totalPlatformBalance:   Number(b.total_balance) || 0,
        avgParticipantBalance:  Number(b.avg_balance) || 0,
        positiveBalanceCount:  Number(b.positive_balance_count) || 0,

        // Trading overview
        activeTraders:       Number(t.active_traders) || 0,
        tradersInDrawdown:   Number(t.traders_in_drawdown) || 0,
        breachedAccounts:   Number(t.breached_accounts) || 0,
        totalFundedCapital: Number(t.funded_capital) || 0,
        totalFloatingPnl:   Number(live.floating_pnl) || 0,
        todaysPnl:          Number(today.todays_pnl) || 0,
        totalDrawdown:      Number(t.total_drawdown) || 0,
        riskAlerts:         Number(t.risk_alerts) || 0,
        accountsLocked:     Number(t.accounts_locked) || 0,
        currentlyTrading:   Number(live.currently_trading) || 0,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}
