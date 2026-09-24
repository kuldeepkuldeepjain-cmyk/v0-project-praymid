"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ComponentType } from "react"
import { Activity, AlertTriangle, BarChart3, Clock3, RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminFetch } from "@/lib/auth"

type TraderAnalytics = {
  trader: string; trades: number; avgDuration: string; avgLot: number; avgRisk: number; winRate: number; lossRate: number
  profitFactor: number | null; avgWin: number; avgLoss: number; riskReward: number | null; tradesPerDay: number
  overtrading: boolean; maxLosses: number; maxWins: number; session: string; topSymbol: string; bestDay: string; worstDay: string
  afterLoss: number; afterProfit: number; revengePattern: boolean; lotEscalation: boolean
}
type Summary = { traders: number; trades: number; overtrading: number; revenge: number; escalation: number }

const metricGroups = [
  { title: "Execution profile", icon: Clock3, metrics: [["Average trade duration", "avgDuration"], ["Average lot size", "avgLot"], ["Average risk", "avgRisk"], ["Trades / day", "tradesPerDay"]] },
  { title: "Performance", icon: BarChart3, metrics: [["Win rate", "winRate"], ["Loss rate", "lossRate"], ["Profit factor", "profitFactor"], ["Risk / reward", "riskReward"]] },
  { title: "Behaviour signals", icon: Activity, metrics: [["After loss", "afterLoss"], ["After large profit", "afterProfit"], ["Max consecutive losses", "maxLosses"], ["Max consecutive wins", "maxWins"]] },
] as const

export function TraderBehaviourPanel() {
  const [rows, setRows] = useState<TraderAnalytics[]>([])
  const [summary, setSummary] = useState<Summary>({ traders: 0, trades: 0, overtrading: 0, revenge: 0, escalation: 0 })
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const summaryCards: Array<{ label: string; value: number; Icon: ComponentType<{ className?: string }> }> = [
    { label: "Traders analysed", value: summary.traders, Icon: Users },
    { label: "Trades reviewed", value: summary.trades, Icon: BarChart3 },
    { label: "Overtrading flags", value: summary.overtrading, Icon: TrendingUp },
    { label: "Revenge patterns", value: summary.revenge, Icon: AlertTriangle },
    { label: "Lot escalations", value: summary.escalation, Icon: TrendingDown },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminFetch("/api/admin/trader-behaviour")
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load analytics")
      setRows(data.analytics || [])
      setSummary(data.summary)
      setMessage(data.message || null)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load analytics") } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const visible = useMemo(() => rows.filter((row) => filter === "all" || (filter === "overtrading" && row.overtrading) || (filter === "revenge" && row.revengePattern) || (filter === "escalation" && row.lotEscalation)), [filter, rows])
  const value = (row: TraderAnalytics, key: string) => { const value = row[key as keyof TraderAnalytics]; if (value == null) return "—"; if (["winRate", "lossRate"].includes(key)) return `${value}%`; if (["avgWin", "avgLoss"].includes(key)) return `$${value}`; return String(value) }

  return <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400"><Activity className="size-4" /> Behaviour intelligence</div><h1 className="text-2xl font-bold text-white sm:text-3xl">Trader Behaviour Analytics</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Understand trading habits, performance patterns, and escalation signals across the platform. Analytics support compliance review and do not automatically restrict accounts.</p></div><Button onClick={load} variant="outline" className="w-fit border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" disabled={loading}><RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} /> Refresh analytics</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summaryCards.map(({ label, value, Icon }) => <Card key={label} className="border-slate-800 bg-slate-900/70"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div><Icon className="size-5 text-cyan-300" /></CardContent></Card>)}</div>
    <Card className="border-slate-800 bg-slate-900/70"><CardHeader className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base text-white">Trader profiles</CardTitle><p className="mt-1 text-xs text-slate-500">Closed trade history · last 90 days · select a trader for the full profile.</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full border-slate-700 bg-slate-950 text-slate-200 sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All traders</SelectItem><SelectItem value="overtrading">Overtrading flags</SelectItem><SelectItem value="revenge">Revenge patterns</SelectItem><SelectItem value="escalation">Lot escalations</SelectItem></SelectContent></Select></CardHeader><CardContent className="p-0">{message && <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">{message}</div>}{loading ? <div className="flex items-center gap-3 p-8 text-sm text-slate-400"><RefreshCw className="size-4 animate-spin" /> Loading trader analytics…</div> : visible.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No closed trade history matches this filter.</div> : <div className="divide-y divide-slate-800">{visible.map((row) => { const open = selected === row.trader; return <div key={row.trader} className="p-4 sm:p-5"><button onClick={() => setSelected(open ? null : row.trader)} className="flex w-full flex-col gap-3 text-left lg:flex-row lg:items-center" aria-expanded={open}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{row.trader}</h3>{row.overtrading && <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">Overtrading</Badge>}{row.revengePattern && <Badge className="border-red-500/40 bg-red-500/10 text-red-300">Revenge pattern</Badge>}{row.lotEscalation && <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-300">Lot escalation</Badge>}</div><p className="mt-1 text-xs text-slate-500">{row.trades} trades · {row.topSymbol} most traded · {row.session} session</p></div><div className="grid grid-cols-4 gap-3 text-xs sm:grid-cols-6 lg:w-[650px]"><span><b className="block text-slate-500">Win rate</b><strong className="text-emerald-300">{row.winRate}%</strong></span><span><b className="block text-slate-500">Avg lot</b><strong className="text-slate-200">{row.avgLot}</strong></span><span><b className="block text-slate-500">Avg risk</b><strong className="text-slate-200">{row.avgRisk}</strong></span><span><b className="block text-slate-500">PF</b><strong className="text-cyan-300">{row.profitFactor ?? "—"}</strong></span><span><b className="block text-slate-500">R/R</b><strong className="text-slate-200">{row.riskReward ?? "—"}</strong></span><span><b className="block text-slate-500">Duration</b><strong className="text-slate-200">{row.avgDuration}</strong></span></div></button>{open && <div className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-3">{metricGroups.map((group) => <div key={group.title}><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300"><group.icon className="size-4" />{group.title}</div><div className="grid grid-cols-2 gap-3">{group.metrics.map(([label, key]) => <div key={key}><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-200">{value(row, key)}</p></div>)}</div></div>)}<div className="md:col-span-3 border-t border-slate-800 pt-3 text-xs text-slate-500">Trading session: <span className="text-slate-200">{row.session}</span> · Best day: <span className="text-emerald-300">{row.bestDay}</span> · Worst day: <span className="text-red-300">{row.worstDay}</span></div></div>}</div>})}</div>}</CardContent></Card>
  </div>
}
