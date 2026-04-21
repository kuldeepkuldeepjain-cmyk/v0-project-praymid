"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface RevenueStats {
  totalApprovedContributions: number
  platformRevenue: number
  averageRevenuePerUser: number
  revenueGrowth: number
}

export function PlatformRevenueTracker() {
  const [stats, setStats] = useState<RevenueStats>({
    totalApprovedContributions: 0,
    platformRevenue: 0,
    averageRevenuePerUser: 0,
    revenueGrowth: 0,
  })

  useEffect(() => {
    fetchRevenueStats()
    const interval = setInterval(fetchRevenueStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchRevenueStats = async () => {
    try {
      const supabase = createClient()

      // Fetch all approved payment submissions
      const { data: approvedPayments, error } = await supabase
        .from("payment_submissions")
        .select("id, created_at")
        .eq("status", "approved")

      if (error) throw error

      const totalApproved = approvedPayments?.length || 0
      const platformRevenue = totalApproved * 10 // $10 per approved contribution

      // Calculate average revenue per active user
      const { count: activeUsers } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      const avgRevenue = activeUsers && activeUsers > 0 ? platformRevenue / activeUsers : 0

      // Calculate revenue growth (comparing this month vs last month)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      const { data: thisMonthApprovals } = await supabase
        .from("payment_submissions")
        .select("id")
        .eq("status", "approved")
        .gte("created_at", startOfMonth.toISOString())

      const { data: lastMonthApprovals } = await supabase
        .from("payment_submissions")
        .select("id")
        .eq("status", "approved")
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString())

      const thisMonthRevenue = (thisMonthApprovals?.length || 0) * 10
      const lastMonthRevenue = (lastMonthApprovals?.length || 0) * 10

      const growth =
        lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      setStats({
        totalApprovedContributions: totalApproved,
        platformRevenue,
        averageRevenuePerUser: avgRevenue,
        revenueGrowth: growth,
      })
    } catch (error) {
      console.error("[v0] Error fetching revenue stats:", error)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-slate-900 border-purple-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-400" />
          Platform Revenue Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.platformRevenue.toFixed(0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              From {stats.totalApprovedContributions} approved contributions
            </p>
          </div>

          {/* Approved Contributions */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Contributions</span>
              <Users className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalApprovedContributions}</p>
            <p className="text-xs text-slate-500 mt-1">Total approved</p>
          </div>

          {/* Average Revenue Per User */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg per User</span>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.averageRevenuePerUser.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">Active users only</p>
          </div>

          {/* Revenue Growth */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Month Growth</span>
              {stats.revenueGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-400 transform rotate-180" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                stats.revenueGrowth >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.revenueGrowth >= 0 ? "+" : ""}
              {stats.revenueGrowth.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">vs last month</p>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="mt-4 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-3">Revenue Logic</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Contribution Amount:</span>
              <span className="text-white">$100</span>
            </div>
            <div className="flex justify-between">
              <span>User Receives:</span>
              <span className="text-green-400">$150</span>
            </div>
            <div className="flex justify-between">
              <span>User Pays Out:</span>
              <span className="text-red-400">-$100</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-2">
              <span className="font-semibold">Platform Retains:</span>
              <span className="text-purple-400 font-bold">$10 per cycle</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
