import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const [participantsRes, paymentsRes, payoutsRes, topupsRes, predictionsRes] = await Promise.all([
      db.query("SELECT id, is_active, status, created_at, account_balance, total_earnings FROM participants"),
      db.query("SELECT id, status, amount, created_at FROM payment_submissions"),
      db.query("SELECT id, status, amount, created_at FROM payout_requests"),
      db.query("SELECT id, status, amount, created_at FROM topup_requests"),
      db.query("SELECT id, status, amount, profit_loss, created_at FROM predictions"),
    ])

    const participants = participantsRes.rows
    const payments = paymentsRes.rows
    const payouts = payoutsRes.rows
    const topups = topupsRes.rows
    const predictions = predictionsRes.rows

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalParticipants = participants.length
    const activeParticipants = participants.filter((p: any) => p.is_active === true || p.status === "active").length
    const newThisWeek = participants.filter((p: any) => new Date(p.created_at) > weekAgo).length
    const newThisMonth = participants.filter((p: any) => new Date(p.created_at) > monthAgo).length
    const totalPlatformBalance = participants.reduce((sum: number, p: any) => sum + Number(p.account_balance || 0), 0)

    const pendingContributions = payments.filter((p: any) => p.status === "pending").length
    const approvedContributions = payments.filter((p: any) => ["approved", "matched"].includes(p.status)).length
    const totalContributedAmount = payments
      .filter((p: any) => ["approved", "matched"].includes(p.status))
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    const pendingPayouts = payouts.filter((p: any) => p.status === "pending").length
    const completedPayouts = payouts.filter((p: any) => ["completed", "processed"].includes(p.status)).length
    const totalPayoutAmount = payouts
      .filter((p: any) => ["completed", "processed"].includes(p.status))
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    const pendingTopups = topups.filter((t: any) => t.status === "pending").length
    const totalTopupAmount = topups
      .filter((t: any) => ["approved", "completed"].includes(t.status))
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

    const activePredictions = predictions.filter((p: any) => ["active", "pending"].includes(p.status)).length
    const settledPredictions = predictions.filter((p: any) => ["settled", "completed", "win", "loss"].includes(p.status)).length

    return NextResponse.json({
      stats: {
        totalParticipants, activeParticipants, newThisWeek, newThisMonth,
        activationRate: totalParticipants > 0 ? Math.round((activeParticipants / totalParticipants) * 100) : 0,
        totalContributions: payments.length, pendingContributions, approvedContributions, totalContributedAmount,
        totalPayouts: payouts.length, pendingPayouts, completedPayouts, totalPayoutAmount,
        pendingTopups, totalTopupAmount,
        totalPredictions: predictions.length, activePredictions, settledPredictions,
        totalPlatformBalance,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
