"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users, DollarSign, TrendingUp, Activity, UserCheck, Wallet,
  Clock, CheckCircle, ArrowDownCircle, BarChart3, RefreshCw,
  AlertCircle, ShieldAlert, Repeat2, BadgeDollarSign, CircleDot,
  ArrowUpCircle, Hourglass,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminFetch } from "@/lib/auth"

const REFRESH_INTERVAL = 30_000 // 30 seconds

interface Stats {
  totalParticipants: number
  activeParticipants: number
  pendingOtpVerification: number
  newThisWeek: number
  newThisMonth: number
  activationRate: number
  totalContributions: number
  pendingContributions: number
  inProcessContributions: number
  approvedContributions: number
  totalContributedAmount: number
  totalPayouts: number
  pendingPayouts: number
  matchedPayouts: number
  completedPayouts: number
  totalPayoutAmount: number
  totalTopups: number
  pendingTopups: number
  approvedTopups: number
  totalTopupAmount: number
  totalPredictions: number
  activePredictions: number
  settledPredictions: number
  totalPredictionProfit: number
  totalPlatformBalance: number
  avgParticipantBalance: number
  positiveBalanceCount: number
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}
function fmtUSDT(n: number) {
  return `${fmt(n)} USDT`
}

function StatCard({
  title, value, sub, icon: Icon, accent, highlight = false,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
  highlight?: boolean
}) {
  return (
    <Card className={`border transition-all duration-200 ${
      highlight
        ? "border-orange-600/60 bg-orange-950/30"
        : "border-slate-700/60 bg-slate-800/50"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1 leading-tight">{title}</p>
            <p className="text-xl font-bold text-white leading-tight truncate">{value}</p>
            {sub && <p className="text-[11px] text-slate-500 mt-1 leading-tight">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex-shrink-0 flex items-center justify-center ${accent}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Section({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-3 first:mt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{badge} pending</Badge>
      )}
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  )
}

export function OverviewAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await adminFetch("/api/admin/stats")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStats(data.stats)
      setLastUpdated(new Date())
      setCountdown(REFRESH_INTERVAL / 1000)
    } catch {
      setError("Could not load platform stats. Retrying automatically.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    fetchStats()
    timerRef.current = setInterval(() => fetchStats(true), REFRESH_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchStats])

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL / 1000 : prev - 1))
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <Card key={i} className="border border-slate-700 bg-slate-800 animate-pulse">
              <CardContent className="p-4 h-[72px]" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-400 text-sm text-center max-w-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry Now
        </Button>
      </div>
    )
  }

  if (!stats) return null

  const totalPending = stats.pendingContributions + stats.pendingPayouts + stats.pendingTopups + stats.pendingOtpVerification

  return (
    <div className="space-y-1">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-white">Platform Overview</h2>
          <p className="text-xs text-slate-500">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Loading..."
            }
            {" · "}
            <span className="text-slate-600">Auto-refresh in {countdown}s</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalPending} items need attention
            </Badge>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Live dot + error banner */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Showing last known data. Failed to refresh.
        </div>
      )}

      {/* ── PARTICIPANTS ── */}
      <Section title="Participants" badge={stats.pendingOtpVerification} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Participants"
          value={fmt(stats.totalParticipants)}
          sub={`${stats.newThisMonth} joined this month`}
          icon={Users}
          accent="bg-cyan-600"
        />
        <StatCard
          title="Active"
          value={fmt(stats.activeParticipants)}
          sub={`${stats.activationRate}% activation rate`}
          icon={UserCheck}
          accent="bg-emerald-600"
        />
        <StatCard
          title="New This Week"
          value={fmt(stats.newThisWeek)}
          icon={TrendingUp}
          accent="bg-blue-600"
        />
        <StatCard
          title="Pending OTP Verify"
          value={fmt(stats.pendingOtpVerification)}
          sub="Awaiting admin approval"
          icon={ShieldAlert}
          accent="bg-rose-600"
          highlight={stats.pendingOtpVerification > 0}
        />
      </div>

      {/* ── CONTRIBUTIONS ── */}
      <Section title="Contributions (Payment Submissions)" badge={stats.pendingContributions + stats.inProcessContributions} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Submissions"
          value={fmt(stats.totalContributions)}
          icon={BarChart3}
          accent="bg-amber-600"
        />
        <StatCard
          title="Pending"
          value={fmt(stats.pendingContributions)}
          sub={`${stats.inProcessContributions} in process`}
          icon={Clock}
          accent="bg-orange-600"
          highlight={stats.pendingContributions > 0}
        />
        <StatCard
          title="Approved / Matched"
          value={fmt(stats.approvedContributions)}
          icon={CheckCircle}
          accent="bg-emerald-600"
        />
        <StatCard
          title="Total Contributed"
          value={fmtUSDT(stats.totalContributedAmount)}
          sub="Approved contributions"
          icon={BadgeDollarSign}
          accent="bg-emerald-700"
        />
      </div>

      {/* ── PAYOUTS ── */}
      <Section title="Payout Requests" badge={stats.pendingPayouts} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Requests"
          value={fmt(stats.totalPayouts)}
          icon={ArrowDownCircle}
          accent="bg-rose-600"
        />
        <StatCard
          title="Pending"
          value={fmt(stats.pendingPayouts)}
          sub={`${stats.matchedPayouts} matched`}
          icon={Hourglass}
          accent="bg-orange-600"
          highlight={stats.pendingPayouts > 0}
        />
        <StatCard
          title="Completed"
          value={fmt(stats.completedPayouts)}
          icon={CheckCircle}
          accent="bg-emerald-600"
        />
        <StatCard
          title="Total Paid Out"
          value={fmtUSDT(stats.totalPayoutAmount)}
          sub="Completed payouts"
          icon={Wallet}
          accent="bg-rose-700"
        />
      </div>

      {/* ── TOP-UPS ── */}
      <Section title="Top-Up Requests" badge={stats.pendingTopups} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Top-Ups"
          value={fmt(stats.totalTopups)}
          icon={ArrowUpCircle}
          accent="bg-yellow-600"
        />
        <StatCard
          title="Pending"
          value={fmt(stats.pendingTopups)}
          icon={Clock}
          accent="bg-orange-600"
          highlight={stats.pendingTopups > 0}
        />
        <StatCard
          title="Approved"
          value={fmt(stats.approvedTopups)}
          icon={CheckCircle}
          accent="bg-emerald-600"
        />
        <StatCard
          title="Total Top-Up Volume"
          value={fmtUSDT(stats.totalTopupAmount)}
          sub="Approved only"
          icon={DollarSign}
          accent="bg-yellow-700"
        />
      </div>

      {/* ── PREDICTIONS ── */}
      <Section title="Predictions (Trades)" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Predictions"
          value={fmt(stats.totalPredictions)}
          icon={Activity}
          accent="bg-indigo-600"
        />
        <StatCard
          title="Active / Pending"
          value={fmt(stats.activePredictions)}
          icon={CircleDot}
          accent="bg-violet-600"
        />
        <StatCard
          title="Settled"
          value={fmt(stats.settledPredictions)}
          icon={Repeat2}
          accent="bg-teal-600"
        />
        <StatCard
          title="Total Profit Generated"
          value={fmtUSDT(stats.totalPredictionProfit)}
          sub="Win payouts"
          icon={TrendingUp}
          accent="bg-teal-700"
        />
      </div>

      {/* ── PLATFORM BALANCE ── */}
      <Section title="Platform Balance" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 border border-cyan-700/40 bg-cyan-950/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Total Account Balances (All Participants)
              </p>
              <p className="text-3xl font-bold text-cyan-300">
                {fmtUSDT(stats.totalPlatformBalance)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Avg {fmtUSDT(stats.avgParticipantBalance)} per participant
              </p>
            </div>
            <Wallet className="h-10 w-10 text-cyan-500 flex-shrink-0" />
          </CardContent>
        </Card>
        <StatCard
          title="With Positive Balance"
          value={`${fmt(stats.positiveBalanceCount)} participants`}
          sub={`${stats.totalParticipants > 0 ? Math.round((stats.positiveBalanceCount / stats.totalParticipants) * 100) : 0}% of total`}
          icon={UserCheck}
          accent="bg-cyan-700"
        />
      </div>
    </div>
  )
}
