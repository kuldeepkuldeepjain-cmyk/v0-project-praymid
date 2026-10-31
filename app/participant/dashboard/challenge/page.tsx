"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, ArrowUpRight, Check, Copy, ShieldCheck, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageLoader } from "@/components/ui/page-loader"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { participantFetch } from "@/lib/auth"
import { DEFAULT_CHALLENGE_PLANS, getChallengeStatusLabel, type ChallengePlan } from "@/lib/challenge-account"

const CHALLENGE_URL = "/api/participant/challenge"
const SETTINGS_URL = "/api/public/settings"
const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

async function participantFetcher(url: string) {
  const response = await participantFetch(url, { cache: "no-store" })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.message || "Unable to load Challenge account")
  return data
}

async function settingsFetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Unable to load payment settings")
  return response.json()
}

export default function ChallengePage() {
  const { data, error, isLoading, mutate } = useSWR(CHALLENGE_URL, participantFetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  })
  const { data: paymentSettings } = useSWR(SETTINGS_URL, settingsFetcher, { revalidateOnFocus: false })
  const [selectedPlanKey, setSelectedPlanKey] = useState(DEFAULT_CHALLENGE_PLANS[1].key)
  const [planInitialized, setPlanInitialized] = useState(false)
  const [paymentNetwork, setPaymentNetwork] = useState("BEP20")
  const [transactionHash, setTransactionHash] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const participant = data?.participant
  const status = participant?.challenge_status || "not_started"
  const plans: ChallengePlan[] = data?.plans?.length ? data.plans : DEFAULT_CHALLENGE_PLANS

  useEffect(() => {
    if (!planInitialized && participant?.challenge_plan_key) {
      setSelectedPlanKey(participant.challenge_plan_key)
      setPlanInitialized(true)
    }
  }, [participant?.challenge_plan_key, planInitialized])

  const availableNetworks = useMemo(() => {
    const addresses = [
      { key: "TRC20", address: paymentSettings?.trc20_address },
      { key: "BEP20", address: paymentSettings?.bep20_address || paymentSettings?.topup_address },
      { key: "ERC20", address: paymentSettings?.erc20_address },
    ].filter((item) => typeof item.address === "string" && item.address.trim())
    return addresses
  }, [paymentSettings])
  const currentAddress = availableNetworks.find((item) => item.key === paymentNetwork)?.address || ""
  const plan = plans.find((item) => item.key === selectedPlanKey) || plans[0] || DEFAULT_CHALLENGE_PLANS[1]
  const metrics = data?.metrics
  const recentTrades = Array.isArray(data?.recentTrades) ? data.recentTrades : []
  const canSubmitPayment = participant?.account_type === "challenge"
    && !["active", "pending_payment", "passed"].includes(status)
  const progress = Math.max(0, Math.min(100, Number(metrics?.progressPercent) || 0))
  const displayStatus = getChallengeStatusLabel(status)

  async function copyAddress() {
    if (!currentAddress) return
    try {
      await navigator.clipboard.writeText(currentAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setMessage("Could not copy the payment address. Please copy it manually.")
    }
  }

  async function submitPayment() {
    if (!plan || !currentAddress) {
      setMessage("No receiving address is configured for this payment network. Select another network or contact support.")
      return
    }
    setSubmitting(true)
    setMessage("")
    try {
      const response = await participantFetch(CHALLENGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: plan.key, transactionHash, walletAddress, paymentNetwork }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to submit Challenge payment")
      setMessage(result.message || "Challenge payment submitted for review.")
      setTransactionHash("")
      setWalletAddress("")
      await mutate()
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "Unable to submit payment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <PageLoader variant="subpage" />

  if (error || !data?.success) {
    return (
      <main className="min-h-screen bg-[#111315] px-4 py-8 text-slate-100">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Link href="/participant/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
            <CardContent className="p-6">
              <h1 className="text-xl font-semibold">Challenge account unavailable</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{error instanceof Error ? error.message : "Please sign in and try again."}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111315] px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Link href="/participant/dashboard" className="inline-flex items-center gap-2 self-start text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>

        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d6b66b]">EliteFund Challenge</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Evaluation dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">A simulated trading evaluation with server-checked entries, verified market pricing, and clear risk thresholds.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
            <ShieldCheck className="size-4" /> {displayStatus}
          </span>
        </header>

        {participant?.account_type !== "challenge" ? (
          <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
            <CardHeader>
              <CardTitle className="text-white">Choose Challenge during registration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <p className="max-w-2xl text-sm leading-6 text-slate-400">Challenge is a separate account type with its own virtual balance and evaluation. Create a Challenge account from the registration page to continue.</p>
              <Button asChild className="bg-[#d6b66b] font-semibold text-[#111315] hover:bg-[#e2c982]">
                <Link href="/participant/register">Create a Challenge account <ArrowUpRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {status === "active" && plan && metrics ? (
          <>
            <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-white">{plan.name} evaluation</CardTitle>
                  <p className="mt-1 text-sm text-slate-400">Started {participant.challenge_started_at ? new Date(participant.challenge_started_at).toLocaleDateString() : "recently"}</p>
                </div>
                <p className="font-mono text-sm text-slate-300">Virtual start {CURRENCY.format(plan.startingBalance)}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Evaluation equity" value={CURRENCY.format(Number(metrics.equity) || 0)} />
                  <Metric label="Profit target" value={CURRENCY.format(Number(metrics.profitTarget) || 0)} detail={`+${plan.profitTargetPercent}%`} />
                  <Metric label="Daily loss floor" value={CURRENCY.format(Number(metrics.dailyLossFloor) || 0)} detail={`${plan.dailyLossLimitPercent}% max`} />
                  <Metric label="Maximum drawdown floor" value={CURRENCY.format(Number(metrics.maxEquityDrawdown) || 0)} detail={`${plan.maxDrawdownPercent}% max`} />
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">Profit target progress</p>
                      <p className="mt-1 text-xs text-slate-400">{Number(metrics.profitPercent).toFixed(2)}% of {plan.profitTargetPercent}% required</p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-amber-100">{progress.toFixed(1)}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label="Profit target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                    <div className="h-full rounded-full bg-[#d6b66b] transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><p className="text-xs text-slate-500">Trading days</p><p className="mt-1 font-semibold text-white">{Number(participant.challenge_trading_days) || 0} / {plan.minimumTradingDays}</p></div>
                    <div><p className="text-xs text-slate-500">Daily loss used</p><p className="mt-1 font-semibold text-white">{Math.max(0, Number(metrics.dailyLossPercent) || 0).toFixed(2)}% / {plan.dailyLossLimitPercent}%</p></div>
                    <div><p className="text-xs text-slate-500">Overall drawdown</p><p className="mt-1 font-semibold text-white">{Math.max(0, Number(metrics.drawdownPercent) || 0).toFixed(2)}% / {plan.maxDrawdownPercent}%</p></div>
                  </div>
                  {!metrics.quotesCurrent && Number(metrics.openPositions) > 0 && (
                    <p className="mt-3 text-xs leading-5 text-amber-100">Live quotes are temporarily unavailable. Open-position equity will refresh when market data reconnects.</p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Rule title="Profit target" value={`+${plan.profitTargetPercent}%`} detail={`Reach ${CURRENCY.format(Number(metrics.profitTarget) || 0)} equity.`} />
                  <Rule title="Daily loss limit" value={`${plan.dailyLossLimitPercent}%`} detail={`Measured from the first Challenge trade of each UTC day.`} />
                  <Rule title="Maximum drawdown" value={`${plan.maxDrawdownPercent}%`} detail={`Static floor at ${CURRENCY.format(Number(metrics.maxEquityDrawdown) || 0)} of starting balance.`} />
                  <Rule title="Minimum trading days" value={`${plan.minimumTradingDays} days`} detail={`Trade on at least ${plan.minimumTradingDays} separate UTC dates.`} />
                  <Rule title="Leverage" value={`Up to ${plan.leverage}:1`} detail="The server rejects orders above the plan limit." />
                  <Rule title="Eligible to pass" value={Number(participant.challenge_trading_days) >= plan.minimumTradingDays && Number(metrics.equity) >= Number(metrics.profitTarget) ? "Yes" : "Not yet"} detail="Target and minimum trading days must both be met." />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
              <CardHeader><CardTitle className="text-white">Recent Challenge trades</CardTitle></CardHeader>
              <CardContent>
                {recentTrades.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 pr-4">Instrument</th><th className="pb-3 pr-4">Side</th><th className="pb-3 pr-4">Closed</th><th className="pb-3 text-right">P&amp;L</th></tr></thead>
                      <tbody>{recentTrades.map((trade: any) => <tr key={trade.id} className="border-b border-slate-800 last:border-0"><td className="py-3 pr-4 font-medium text-white">{trade.pair}</td><td className="py-3 pr-4 text-slate-300">{trade.direction}</td><td className="py-3 pr-4 text-slate-400">{trade.close_time ? new Date(trade.close_time).toLocaleString() : "—"}</td><td className="py-3 text-right font-mono text-slate-100">{CURRENCY.format(Number(trade.final_pnl) || 0)}</td></tr>)}</tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-400">Your verified closed trades will appear here.</p>}
              </CardContent>
            </Card>
          </>
        ) : null}

        {canSubmitPayment && plan ? (
          <>
            <section aria-labelledby="challenge-plans-heading" className="flex flex-col gap-4">
              <div>
                <h2 id="challenge-plans-heading" className="text-lg font-semibold text-white">{status === "failed" ? "Start a new evaluation" : status === "payment_rejected" ? "Resubmit your Challenge fee" : "Choose a Challenge plan"}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">The fee is paid separately. Approval activates the selected virtual balance; it is not a wallet deposit.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {plans.map((item) => (
                  <button key={item.key} type="button" onClick={() => setSelectedPlanKey(item.key)} aria-pressed={selectedPlanKey === item.key} className={`rounded-xl text-left transition ${selectedPlanKey === item.key ? "ring-2 ring-[#d6b66b]" : ""}`}>
                    <Card className="h-full border-slate-700 bg-[#181b1f] text-slate-100 transition hover:border-amber-300/50">
                      <CardHeader><CardTitle className="flex items-center justify-between gap-2 text-base text-white"><span>{item.name}</span><span className="font-mono text-amber-100">${item.fee}</span></CardTitle></CardHeader>
                      <CardContent className="flex flex-col gap-3 text-sm text-slate-400">
                        <p><strong className="text-2xl text-white">{CURRENCY.format(item.startingBalance)}</strong><span className="ml-2 text-xs">virtual balance</span></p>
                        <p>Target <strong className="text-slate-200">+{item.profitTargetPercent}%</strong> · Daily limit <strong className="text-slate-200">{item.dailyLossLimitPercent}%</strong></p>
                        <p>Max drawdown <strong className="text-slate-200">{item.maxDrawdownPercent}%</strong> · {item.minimumTradingDays} trading days · {item.leverage}:1 max leverage</p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </section>

            <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
              <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="size-5 text-[#d6b66b]" /> Submit {plan.name} payment</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                {status === "payment_rejected" && data.paymentReview?.adminNote && (
                  <div role="status" className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">Review note: {data.paymentReview.adminNote}</div>
                )}
                {status === "failed" && <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm leading-6 text-slate-300">Your previous evaluation is closed. A new approved fee starts a fresh evaluation and resets the trading-day and drawdown counters.</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Fee" value={`${CURRENCY.format(plan.fee)} USDT`} />
                  <Metric label="Virtual starting balance" value={CURRENCY.format(plan.startingBalance)} />
                  <Metric label="Leverage" value={`${plan.leverage}:1`} />
                </div>

                {availableNetworks.length ? (
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="challenge-network" className="text-slate-200">Payment network</Label>
                      <Select value={paymentNetwork} onValueChange={setPaymentNetwork}>
                        <SelectTrigger id="challenge-network" className="border-slate-700 bg-slate-900 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>{availableNetworks.map((network) => <SelectItem key={network.key} value={network.key}>{network.key}</SelectItem>)}</SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label htmlFor="challenge-receiving-address" className="text-slate-200">Send {CURRENCY.format(plan.fee)} USDT to this address</Label>
                      <div className="flex gap-2">
                        <Input id="challenge-receiving-address" readOnly value={currentAddress} className="min-w-0 border-slate-700 bg-slate-900 font-mono text-xs text-white" />
                        <Button type="button" variant="outline" onClick={copyAddress} className="shrink-0 border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"><Copy data-icon="inline-start" />{copied ? "Copied" : "Copy"}</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p role="status" className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">No Challenge receiving address is configured yet. Contact support before sending a payment.</p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2"><Label htmlFor="challenge-sender-wallet" className="text-slate-200">Your sending wallet</Label><Input id="challenge-sender-wallet" autoComplete="off" value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} placeholder="Wallet address used to send the fee" className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" /></div>
                  <div className="flex flex-col gap-2"><Label htmlFor="challenge-transaction-hash" className="text-slate-200">Transaction hash</Label><Input id="challenge-transaction-hash" autoComplete="off" value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="Paste your transaction hash" className="border-slate-700 bg-slate-900 font-mono text-white placeholder:text-slate-500" /></div>
                </div>
                <Button type="button" onClick={submitPayment} disabled={submitting || !currentAddress || !transactionHash.trim() || !walletAddress.trim()} className="h-11 self-start bg-[#d6b66b] font-semibold text-[#111315] hover:bg-[#e2c982]">
                  <TrendingUp data-icon="inline-start" />{submitting ? "Submitting…" : `Submit ${CURRENCY.format(plan.fee)} fee`}
                </Button>
                {message && <p className="text-sm text-slate-300" role="status">{message}</p>}
                <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Check className="mt-0.5 size-3 shrink-0 text-amber-200" /> Payment is reviewed by the team. Do not send funds until the receiving address and network are confirmed.</p>
              </CardContent>
            </Card>
          </>
        ) : null}

        {status === "pending_payment" && (
          <Card className="border-amber-300/25 bg-[#181b1f] text-slate-100">
            <CardHeader><CardTitle className="text-white">Payment under review</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm leading-6 text-slate-400">
              <p>Your Challenge fee has been submitted. The virtual starting balance is not available until the payment is approved.</p>
              {data.paymentReview?.transactionId && <p>Transaction: <span className="break-all font-mono text-slate-200">{data.paymentReview.transactionId}</span></p>}
              {data.paymentReview?.amount > 0 && <p>Fee submitted: {CURRENCY.format(data.paymentReview.amount)} USDT</p>}
            </CardContent>
          </Card>
        )}

        {status === "passed" && (
          <Card className="border-emerald-500/30 bg-[#181b1f] text-slate-100">
            <CardHeader><CardTitle className="text-white">Evaluation passed</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm leading-6 text-slate-400">
              <p>Your equity target and minimum trading-day requirements are complete. Your result is ready for next-stage review.</p>
              {participant.challenge_passed_at && <p>Passed on {new Date(participant.challenge_passed_at).toLocaleString()}.</p>}
            </CardContent>
          </Card>
        )}

        {status === "failed" && metrics && (
          <Card className="border-slate-700 bg-[#181b1f] text-slate-100">
            <CardHeader><CardTitle className="text-white">Evaluation ended at {CURRENCY.format(Number(metrics.equity) || 0)}</CardTitle></CardHeader>
            <CardContent className="text-sm leading-6 text-slate-400">
              The server recorded a breach of the daily loss or maximum drawdown limit. New positions are disabled. Choose another plan above to request a fresh evaluation.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-amber-100">{detail}</p>}
    </div>
  )
}

function Rule({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-200">{title}</p><span className="font-mono text-sm font-semibold text-amber-100">{value}</span></div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  )
}
