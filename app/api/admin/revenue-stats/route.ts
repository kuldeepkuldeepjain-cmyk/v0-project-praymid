import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Total participants
    const participantRows = await query("SELECT COUNT(*) as count FROM participants")
    const totalUsers = Number(participantRows?.[0]?.count) || 0

    // Contribution revenue (from topup_requests that are approved)
    const topupRows = await query(
      `SELECT SUM(amount) as total FROM topup_requests WHERE status = 'approved'`
    )
    const totalContributions = Number(topupRows?.[0]?.total) || 0

    // Spin costs (each spin costs $5)
    const spinTransactionsRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'spin_cost'`
    )
    const spinCost = Number(spinTransactionsRows?.[0]?.total) || 0

    // Prediction costs
    const predictionTransactionsRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'prediction_entry'`
    )
    const predictionCost = Number(predictionTransactionsRows?.[0]?.total) || 0

    const totalPlatformRevenue = totalContributions + spinCost + predictionCost
    const averageRevenuePerUser = totalUsers > 0 ? totalPlatformRevenue / totalUsers : 0

    // Calculate revenue growth (this month vs last month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthTopupRows = await query(
      `SELECT SUM(amount) as total FROM topup_requests WHERE status = 'approved' AND created_at >= $1`,
      [startOfMonth.toISOString()]
    )
    const thisMonthContributions = Number(thisMonthTopupRows?.[0]?.total) || 0

    const thisMonthSpinRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'spin_cost' AND created_at >= $1`,
      [startOfMonth.toISOString()]
    )
    const thisMonthSpin = Number(thisMonthSpinRows?.[0]?.total) || 0

    const thisMonthPredictionRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'prediction_entry' AND created_at >= $1`,
      [startOfMonth.toISOString()]
    )
    const thisMonthPrediction = Number(thisMonthPredictionRows?.[0]?.total) || 0

    const thisMonthRevenue = thisMonthContributions + thisMonthSpin + thisMonthPrediction

    const lastMonthTopupRows = await query(
      `SELECT SUM(amount) as total FROM topup_requests WHERE status = 'approved' AND created_at >= $1 AND created_at <= $2`,
      [startOfLastMonth.toISOString(), endOfLastMonth.toISOString()]
    )
    const lastMonthContributions = Number(lastMonthTopupRows?.[0]?.total) || 0

    const lastMonthSpinRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'spin_cost' AND created_at >= $1 AND created_at <= $2`,
      [startOfLastMonth.toISOString(), endOfLastMonth.toISOString()]
    )
    const lastMonthSpin = Number(lastMonthSpinRows?.[0]?.total) || 0

    const lastMonthPredictionRows = await query(
      `SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'prediction_entry' AND created_at >= $1 AND created_at <= $2`,
      [startOfLastMonth.toISOString(), endOfLastMonth.toISOString()]
    )
    const lastMonthPrediction = Number(lastMonthPredictionRows?.[0]?.total) || 0

    const lastMonthRevenue = lastMonthContributions + lastMonthSpin + lastMonthPrediction

    const revenueGrowth =
      lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    return NextResponse.json({
      totalContributions,
      spinCost,
      predictionCost,
      totalPlatformRevenue,
      activeUsers: totalUsers,
      averageRevenuePerUser,
      revenueGrowth,
    })
  } catch (error) {
    console.error("[v0] Revenue stats error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue stats" }, { status: 500 })
  }
}
