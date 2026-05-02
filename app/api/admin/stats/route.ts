import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    // Run all queries in parallel for speed
    const [
      participants,
      payments,
      payouts,
      topups,
      predictions,
    ] = await Promise.all([
      sql`SELECT id, is_active, status, created_at, account_balance, total_earnings FROM participants`,
      sql`SELECT id, status, amount, created_at FROM payment_submissions`,
      sql`SELECT id, status, amount, created_at FROM payout_requests`,
      sql`SELECT id, status, amount, created_at FROM topup_requests`,
      sql`SELECT id, status, amount, profit_loss, created_at FROM predictions`,
    ])

    // Participant stats
    const totalParticipants = participants.length
    const activeParticipants = participants.filter((p: any) => p.is_active === true || p.status === "active").length
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const newThisWeek = participants.filter((p: any) => new Date(p.created_at) > weekAgo).length
    const newThisMonth = participants.filter((p: any) => new Date(p.created_at) > monthAgo).length

    // Contribution (payment submission) stats
    const totalContributions = payments.length
    const pendingContributions = payments.filter((p: any) => p.status === "pending").length
    const approvedContributions = payments.filter((p: any) => p.status === "approved" || p.status === "matched").length
    const totalContributedAmount = payments
      .filter((p: any) => p.status === "approved" || p.status === "matched")
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Payout stats
    const totalPayouts = payouts.length
    const pendingPayouts = payouts.filter((p: any) => p.status === "pending").length
    const completedPayouts = payouts.filter((p: any) => p.status === "completed" || p.status === "processed").length
    const totalPayoutAmount = payouts
      .filter((p: any) => p.status === "completed" || p.status === "processed")
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Top-up stats
    const pendingTopups = topups.filter((t: any) => t.status === "pending").length
    const totalTopupAmount = topups
      .filter((t: any) => t.status === "approved" || t.status === "completed")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

    // Prediction stats
    const totalPredictions = predictions.length
    const activePredictions = predictions.filter((p: any) => p.status === "active" || p.status === "pending").length
    const settledPredictions = predictions.filter((p: any) => p.status === "settled" || p.status === "completed" || p.status === "win" || p.status === "loss").length

    // Total platform balance (sum of all participant account balances)
    const totalPlatformBalance = participants.reduce((sum: number, p: any) => sum + Number(p.account_balance || 0), 0)

    const stats = {
      totalParticipants,
      activeParticipants,
      newThisWeek,
      newThisMonth,
      activationRate: totalParticipants > 0 ? Math.round((activeParticipants / totalParticipants) * 100) : 0,
      totalContributions,
      pendingContributions,
      approvedContributions,
      totalContributedAmount,
      totalPayouts,
      pendingPayouts,
      completedPayouts,
      totalPayoutAmount,
      pendingTopups,
      totalTopupAmount,
      totalPredictions,
      activePredictions,
      settledPredictions,
      totalPlatformBalance,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("[API] Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
