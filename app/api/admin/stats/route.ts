import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdminSession } from "@/lib/auth-middleware"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = getAdminClient()

    // Run all queries in parallel for speed
    const [
      participantsRes,
      paymentSubmissionsRes,
      payoutRequestsRes,
      topupRequestsRes,
      predictionsRes,
      transactionsRes,
    ] = await Promise.all([
      supabase.from("participants").select("id, is_active, status, created_at, account_balance, total_earnings"),
      supabase.from("payment_submissions").select("id, status, amount, created_at"),
      supabase.from("payout_requests").select("id, status, amount, created_at"),
      supabase.from("topup_requests").select("id, status, amount, created_at"),
      supabase.from("predictions").select("id, status, amount, profit_loss, created_at"),
      supabase.from("transactions").select("id, type, amount, created_at"),
    ])

    const participants = participantsRes.data || []
    const payments = paymentSubmissionsRes.data || []
    const payouts = payoutRequestsRes.data || []
    const topups = topupRequestsRes.data || []
    const predictions = predictionsRes.data || []
    const transactions = transactionsRes.data || []

    // Participant stats
    const totalParticipants = participants.length
    const activeParticipants = participants.filter(p => p.is_active === true || p.status === "active").length
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const newThisWeek = participants.filter(p => new Date(p.created_at) > weekAgo).length
    const newThisMonth = participants.filter(p => new Date(p.created_at) > monthAgo).length

    // Contribution (payment submission) stats
    const totalContributions = payments.length
    const pendingContributions = payments.filter(p => p.status === "pending").length
    const approvedContributions = payments.filter(p => p.status === "approved" || p.status === "matched").length
    const totalContributedAmount = payments
      .filter(p => p.status === "approved" || p.status === "matched")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    // Payout stats
    const totalPayouts = payouts.length
    const pendingPayouts = payouts.filter(p => p.status === "pending").length
    const completedPayouts = payouts.filter(p => p.status === "completed" || p.status === "processed").length
    const totalPayoutAmount = payouts
      .filter(p => p.status === "completed" || p.status === "processed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    // Top-up stats
    const pendingTopups = topups.filter(t => t.status === "pending").length
    const totalTopupAmount = topups
      .filter(t => t.status === "approved" || t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    // Prediction stats
    const totalPredictions = predictions.length
    const activePredictions = predictions.filter(p => p.status === "active" || p.status === "pending").length
    const settledPredictions = predictions.filter(p => p.status === "settled" || p.status === "completed" || p.status === "win" || p.status === "loss").length

    // Total platform balance (sum of all participant account balances)
    const totalPlatformBalance = participants.reduce((sum, p) => sum + Number(p.account_balance || 0), 0)

    const stats = {
      // Participants
      totalParticipants,
      activeParticipants,
      newThisWeek,
      newThisMonth,
      activationRate: totalParticipants > 0 ? Math.round((activeParticipants / totalParticipants) * 100) : 0,

      // Contributions / Payments
      totalContributions,
      pendingContributions,
      approvedContributions,
      totalContributedAmount,

      // Payouts
      totalPayouts,
      pendingPayouts,
      completedPayouts,
      totalPayoutAmount,

      // Top-ups
      pendingTopups,
      totalTopupAmount,

      // Predictions
      totalPredictions,
      activePredictions,
      settledPredictions,

      // Platform
      totalPlatformBalance,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("[API] Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
