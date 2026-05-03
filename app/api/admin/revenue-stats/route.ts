import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    const [approved, activeUsers, thisMonth, lastMonth] = await Promise.all([
      sql`SELECT COUNT(*) AS total FROM payment_submissions WHERE status = 'approved'`,
      sql`SELECT COUNT(*) AS total FROM participants WHERE is_active = true`,
      sql`SELECT COUNT(*) AS total FROM payment_submissions WHERE status = 'approved' AND created_at >= ${startOfMonth}`,
      sql`SELECT COUNT(*) AS total FROM payment_submissions WHERE status = 'approved' AND created_at >= ${startOfLastMonth} AND created_at <= ${endOfLastMonth}`,
    ])

    const totalApproved = Number(approved[0]?.total || 0)
    const active = Number(activeUsers[0]?.total || 0)
    const thisMonthRev = Number(thisMonth[0]?.total || 0) * 10
    const lastMonthRev = Number(lastMonth[0]?.total || 0) * 10
    const platformRevenue = totalApproved * 10
    const avgRevenue = active > 0 ? platformRevenue / active : 0
    const growth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalApprovedContributions: totalApproved,
        platformRevenue,
        averageRevenuePerUser: avgRevenue,
        revenueGrowth: growth,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
