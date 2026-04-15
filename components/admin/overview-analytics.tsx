"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  UserCheck,
  Wallet,
  Clock,
  CheckCircle,
  ArrowDownCircle,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface Stats {
  totalParticipants: number
  activeParticipants: number
  newThisWeek: number
  newThisMonth: number
  activationRate: number
  totalContributions: number
  pendingContributions: number
  approvedContributions: number
  totalContributedAmount: number
  totalPayouts: number
  pendingPayouts: number
  completedPayouts: number
  totalPayoutAmount: number
  pendingTopups: number
  totalTopupAmount: number
  totalPredictions: number
  activePredictions: number
  settledPredictions: number
  totalPlatformBalance: number
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClass,
  cardClass,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconClass: string
  cardClass: string
}) {
  return (
    <Card className={`border ${cardClass}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconClass}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 mt-6 first:mt-0">
      {title}
    </h3>
  )
}

export function OverviewAnalytics() {
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error(`Failed to fetch stats (${res.status})`)
      const data = await res.json()
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message || "Failed to load stats")
      toast({ title: "Error", description: "Could not load platform stats", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border border-slate-700 bg-slate-800 animate-pulse">
              <CardContent className="p-5 h-20" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-400">{error || "No data available"}</p>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
          <p className="text-sm text-slate-400">Live data from all tables</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Participants */}
      <SectionHeading title="Participants" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Participants"
          value={stats.totalParticipants.toLocaleString()}
          icon={Users}
          iconClass="bg-cyan-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Active Participants"
          value={stats.activeParticipants.toLocaleString()}
          sub={`${stats.activationRate}% activation rate`}
          icon={UserCheck}
          iconClass="bg-emerald-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="New This Week"
          value={stats.newThisWeek.toLocaleString()}
          icon={TrendingUp}
          iconClass="bg-blue-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="New This Month"
          value={stats.newThisMonth.toLocaleString()}
          icon={Activity}
          iconClass="bg-violet-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
      </div>

      {/* Contributions */}
      <SectionHeading title="Contributions (Payment Submissions)" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats.totalContributions.toLocaleString()}
          icon={BarChart3}
          iconClass="bg-amber-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Pending"
          value={stats.pendingContributions.toLocaleString()}
          icon={Clock}
          iconClass="bg-orange-600"
          cardClass="border-amber-900/30 bg-amber-950/20"
        />
        <StatCard
          title="Approved / Matched"
          value={stats.approvedContributions.toLocaleString()}
          icon={CheckCircle}
          iconClass="bg-emerald-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Total Contributed"
          value={`$${stats.totalContributedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Approved contributions"
          icon={DollarSign}
          iconClass="bg-emerald-700"
          cardClass="border-slate-700 bg-slate-800/60"
        />
      </div>

      {/* Payouts */}
      <SectionHeading title="Payout Requests" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.totalPayouts.toLocaleString()}
          icon={ArrowDownCircle}
          iconClass="bg-rose-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Pending Payouts"
          value={stats.pendingPayouts.toLocaleString()}
          icon={Clock}
          iconClass="bg-orange-600"
          cardClass="border-orange-900/30 bg-orange-950/20"
        />
        <StatCard
          title="Completed Payouts"
          value={stats.completedPayouts.toLocaleString()}
          icon={CheckCircle}
          iconClass="bg-emerald-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Total Paid Out"
          value={`$${stats.totalPayoutAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Completed payouts"
          icon={Wallet}
          iconClass="bg-rose-700"
          cardClass="border-slate-700 bg-slate-800/60"
        />
      </div>

      {/* Top-ups & Predictions */}
      <SectionHeading title="Top-Ups & Predictions" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Top-Ups"
          value={stats.pendingTopups.toLocaleString()}
          icon={Clock}
          iconClass="bg-yellow-600"
          cardClass="border-yellow-900/30 bg-yellow-950/20"
        />
        <StatCard
          title="Top-Up Volume"
          value={`$${stats.totalTopupAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub="Approved top-ups"
          icon={DollarSign}
          iconClass="bg-yellow-700"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Total Predictions"
          value={stats.totalPredictions.toLocaleString()}
          sub={`${stats.activePredictions} active`}
          icon={Activity}
          iconClass="bg-indigo-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
        <StatCard
          title="Settled Predictions"
          value={stats.settledPredictions.toLocaleString()}
          icon={CheckCircle}
          iconClass="bg-teal-600"
          cardClass="border-slate-700 bg-slate-800/60"
        />
      </div>

      {/* Platform Balance */}
      <SectionHeading title="Platform Balance" />
      <Card className="border border-cyan-800/40 bg-cyan-950/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Total Account Balances (All Participants)
            </p>
            <p className="text-3xl font-bold text-cyan-300">
              ${stats.totalPlatformBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <Wallet className="h-10 w-10 text-cyan-500" />
        </CardContent>
      </Card>
    </div>
  )
}
