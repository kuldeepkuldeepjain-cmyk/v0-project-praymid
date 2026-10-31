"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ShieldCheck, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageLoader } from "@/components/ui/page-loader"
import { participantFetch } from "@/lib/auth"
import { DEFAULT_CHALLENGE_PLANS, type ChallengePlan, getChallengeStatusLabel } from "@/lib/challenge-account"

export default function ChallengePage() {
  const [plans, setPlans] = useState<ChallengePlan[]>(DEFAULT_CHALLENGE_PLANS)
  const [selected, setSelected] = useState(DEFAULT_CHALLENGE_PLANS[1].key)
  const [status, setStatus] = useState("not_started")
  const [transactionHash, setTransactionHash] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    participantFetch("/api/participant/challenge")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setPlans(data.plans || DEFAULT_CHALLENGE_PLANS)
          setStatus(data.participant?.challenge_status || "not_started")
          if (data.participant?.challenge_plan_key) setSelected(data.participant.challenge_plan_key)
        }
      })
      .catch(() => setMessage("Unable to load Challenge account details."))
      .finally(() => setLoading(false))
  }, [])

  const plan = plans.find((item) => item.key === selected) || plans[0]

  async function submitPayment() {
    setSubmitting(true)
    setMessage("")
    try {
      const response = await participantFetch("/api/participant/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: plan.key, transactionHash, walletAddress }),
      })
      const data = await response.json()
      setMessage(data.message || (data.success ? "Payment submitted." : "Unable to submit payment."))
      if (data.success) setStatus("pending_payment")
    } catch {
      setMessage("Unable to submit payment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader variant="subpage" />

  return (
    <main className="min-h-screen bg-[#111315] px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link href="/participant/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d6b66b]">EliteFund Challenge</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Prove your edge</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Trade a simulated account under clear risk limits. Pass the target and minimum-day rule to become eligible for the next stage.</p></div>
          <span className="rounded-full border border-[#d6b66b]/30 bg-[#d6b66b]/10 px-3 py-1.5 text-xs font-semibold text-[#e2c982]">{getChallengeStatusLabel(status)}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((item) => <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`text-left ${selected === item.key ? "ring-2 ring-[#d6b66b]" : ""} rounded-xl`}><Card className="h-full border-slate-700 bg-[#181b1f] transition hover:border-[#d6b66b]/60"><CardHeader><CardTitle className="flex items-center justify-between text-lg text-white"><span>{item.name}</span><span className="text-[#e2c982]">${item.fee}</span></CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-slate-400"><p className="text-2xl font-bold text-white">${item.startingBalance.toLocaleString()}</p><p>Virtual starting balance</p><div className="space-y-2 border-t border-slate-700 pt-3"><p>Profit target <b className="text-slate-200">{item.profitTargetPercent}%</b></p><p>Daily loss limit <b className="text-slate-200">{item.dailyLossLimitPercent}%</b></p><p>Maximum drawdown <b className="text-slate-200">{item.maxDrawdownPercent}%</b></p><p>Minimum trading days <b className="text-slate-200">{item.minimumTradingDays}</b></p></div></CardContent></Card></button>)}
        </div>

        <Card className="border-slate-700 bg-[#181b1f]"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="size-5 text-[#d6b66b]" /> Submit {plan.name} payment</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-slate-900/60 p-4"><p className="text-xs text-slate-500">Pass target</p><p className="mt-1 font-bold text-emerald-300">+{plan.profitTargetPercent}%</p></div><div className="rounded-lg bg-slate-900/60 p-4"><p className="text-xs text-slate-500">Risk boundary</p><p className="mt-1 font-bold text-rose-300">-{plan.maxDrawdownPercent}%</p></div><div className="rounded-lg bg-slate-900/60 p-4"><p className="text-xs text-slate-500">Leverage</p><p className="mt-1 font-bold text-slate-200">{plan.leverage}:1</p></div></div><div className="grid gap-3 md:grid-cols-2"><Input value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} placeholder="Payment wallet address" className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" /><Input value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="Transaction hash" className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" /></div><Button onClick={submitPayment} disabled={submitting || status === "pending_payment" || status === "active"} className="h-11 bg-[#d6b66b] font-semibold text-[#111315] hover:bg-[#e2c982]"><TrendingUp className="mr-2 size-4" />{submitting ? "Submitting..." : status === "pending_payment" ? "Payment under review" : `Submit $${plan.fee} payment`}</Button>{message && <p className="text-sm text-slate-300" role="status">{message}</p>}<p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><Check className="size-3 text-emerald-400" /> Payment is reviewed before the Challenge balance is activated.</p></CardContent></Card>
      </div>
    </main>
  )
}
