"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react"

interface RevenueStats {
  totalContributions: number
  spinCost: number
  predictionCost: number
  totalPlatformRevenue: number
  activeUsers: number
  averageRevenuePerUser: number
  revenueGrowth: number
}

export function PlatformRevenueTracker() {
  const [stats, setStats] = useState<RevenueStats>({
    totalContributions: 0,
    spinCost: 0,
    predictionCost: 0,
    totalPlatformRevenue: 0,
    activeUsers: 0,
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
      const response = await fetch("/api/admin/revenue-stats", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Failed to fetch revenue stats")
      const data = await response.json()

      setStats({
        totalContributions: data.totalContributions || 0,
        spinCost: data.spinCost || 0,
        predictionCost: data.predictionCost || 0,
        totalPlatformRevenue: data.totalPlatformRevenue || 0,
        activeUsers: data.activeUsers || 0,
        averageRevenuePerUser: data.averageRevenuePerUser || 0,
        revenueGrowth: data.revenueGrowth || 0,
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
            <p className="text-2xl font-bold text-white">${stats.totalPlatformRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">All sources combined</p>
          </div>

          {/* Active Users */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Active Users</span>
              <Users className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
            <p className="text-xs text-slate-500 mt-1">Total participants</p>
          </div>

          {/* Average Revenue Per User */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg per User</span>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.averageRevenuePerUser.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">Revenue per participant</p>
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
          <h4 className="text-sm font-semibold text-white mb-3">Revenue Sources</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Contribution Entry Fees:</span>
              <span className="text-green-400">${stats.totalContributions.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Spin Wheel Costs ($5 each):</span>
              <span className="text-blue-400">${stats.spinCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Prediction Entry Fees:</span>
              <span className="text-purple-400">${stats.predictionCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
              <span className="font-semibold">Total Platform Revenue:</span>
              <span className="text-yellow-400 font-bold">${stats.totalPlatformRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
