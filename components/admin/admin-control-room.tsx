"use client"

import { useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BookOpen,
  Cable,
  Check,
  Database,
  FileClock,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { adminFetch } from "@/lib/auth"

type TabKey = "overview" | "plans" | "accounts" | "risk" | "positions" | "performance" | "payouts" | "payments" | "kyc" | "users" | "audit" | "broker"
type Row = Record<string, unknown>
type RoomData = {
  generatedAt: string
  summary: Row
  accounts: Row[]
  positions: Row[]
  performance: Row
  riskFlags: Row[]
  payouts: Row[]
  payments: Row[]
  kyc: Row[]
  users: Row[]
  auditLogs: Row[]
  accountTypes: Row[]
  history: Row[]
}

const navItems: Array<{ id: TabKey; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "plans", label: "Account types", icon: Landmark },
  { id: "accounts", label: "Trading accounts", icon: Users },
  { id: "risk", label: "Risk & breaches", icon: ShieldCheck },
  { id: "positions", label: "Live positions", icon: ArrowUpRight },
  { id: "performance", label: "Performance", icon: BookOpen },
  { id: "payouts", label: "Payouts", icon: Banknote },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "kyc", label: "KYC review", icon: Check },
  { id: "users", label: "Users", icon: Users },
  { id: "audit", label: "Audit logs", icon: FileClock },
  { id: "broker", label: "Data feed", icon: Cable },
]

const currency = (value: unknown) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0))
const number = (value: unknown, digits = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number(value ?? 0))
const optionalNumber = (value: unknown, digits = 5) => value == null || value === "" ? "—" : number(value, digits)
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString() : "—"
const text = (value: unknown, fallback = "—") => value == null || value === "" ? fallback : String(value)

function StatusBadge({ status }: { status: unknown }) {
  const value = text(status, "unknown")
  const normalized = value.toLowerCase()
  const tone = ["approved", "active", "clear", "reviewed", "completed"].includes(normalized)
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : ["breached", "critical", "high", "rejected", "frozen"].includes(normalized)
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : ["pending", "under_review", "medium", "warning", "processing", "matched"].includes(normalized)
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-border bg-muted/50 text-muted-foreground"
  return <Badge variant="outline" className={tone}>{value.replaceAll("_", " ")}</Badge>
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "warning" | "danger" }) {
  const valueTone = tone === "positive" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : tone === "danger" ? "text-red-300" : "text-foreground"
  return <Card className="border-border/70 bg-card/80"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></CardContent></Card>
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div>{action}</div>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-12 text-center text-sm text-muted-foreground">{children}</div>
}

function TableFrame({ children, minWidth = "min-w-[720px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto rounded-lg border border-border/70"><table className={`w-full ${minWidth} text-left text-sm`}>{children}</table></div>
}

async function requestJSON(path: string, init?: RequestInit) {
  const response = await adminFetch(path, init)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.error || "The request could not be completed.")
  return result
}

async function loadControlRoom(): Promise<RoomData> {
  const result = await requestJSON("/api/admin/trading-control-room")
  return result as RoomData
}

function ControlRoomContent() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [search, setSearch] = useState("")
  const room = useQuery({
    queryKey: ["admin-trading-control-room"],
    queryFn: loadControlRoom,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  const refresh = () => room.refetch()
  const reloadAfterAction = () => queryClient.invalidateQueries({ queryKey: ["admin-trading-control-room"] })

  const closeTrades = useMutation({
    mutationFn: async (email: string) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "close-trades", email }) }),
    onSuccess: (result, email) => {
      toast({ title: "Ledger trades closed", description: `${result.closedCount ?? 0} open trade(s) closed for ${email}.` })
      reloadAfterAction()
    },
    onError: (error) => toast({ title: "Trade close failed", description: error.message, variant: "destructive" }),
  })
  const reviewFlag = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "reviewed" | "dismissed" }) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "review-risk-flag", flagId: id, status }) }),
    onSuccess: () => { toast({ title: "Risk flag updated" }); reloadAfterAction() },
    onError: (error) => toast({ title: "Risk review failed", description: error.message, variant: "destructive" }),
  })
  const payoutAction = useMutation({
    mutationFn: async ({ id }: { id: string }) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "mark-payout-processing", payoutId: id }) }),
    onSuccess: () => { toast({ title: "Payout queue updated" }); reloadAfterAction() },
    onError: (error) => toast({ title: "Payout update failed", description: error.message, variant: "destructive" }),
  })
  const kycAction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "under_review" | "approved" }) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "review-kyc", verificationId: id, status }) }),
    onSuccess: () => { toast({ title: "KYC record updated" }); reloadAfterAction() },
    onError: (error) => toast({ title: "KYC update failed", description: error.message, variant: "destructive" }),
  })

  const data = room.data
  const filteredAccounts = useMemo(() => (data?.accounts ?? []).filter((account) => `${account.id} ${account.trader} ${account.email}`.toLowerCase().includes(search.toLowerCase())), [data?.accounts, search])
  const closeForTrader = (email: string) => {
    const confirmed = window.confirm(`Close every open ledger trade for ${email}? The existing admin action records closure at the stored entry price with zero realized P&L. This does not reach an external broker.`)
    if (confirmed) closeTrades.mutate(email)
  }

  if (room.isLoading && !data) {
    return <Card className="border-border/70 bg-card/50"><CardContent className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading live trading records…</CardContent></Card>
  }

  if (room.isError && !data) {
    return <Card className="border-red-500/30 bg-card/80"><CardContent className="flex flex-col items-start gap-4 p-6"><div><p className="font-semibold text-foreground">Live trading data could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">{room.error instanceof Error ? room.error.message : "Check your admin session and database connection, then retry."}</p></div><Button variant="outline" onClick={() => refresh()} disabled={room.isFetching}><RefreshCw data-icon="inline-start" className={room.isFetching ? "animate-spin" : ""} />Retry</Button></CardContent></Card>
  }

  const summary = data?.summary ?? {}
  const performance = data?.performance ?? {}
  const pendingPayouts = data?.payouts.filter((row) => ["pending", "matched", "approved"].includes(String(row.status))).length ?? 0
  const pendingKyc = data?.kyc.filter((row) => ["pending", "under_review"].includes(String(row.status))).length ?? 0
  const latestSync = data?.generatedAt ? dateTime(data.generatedAt) : "Not yet synced"
  const actionBusy = closeTrades.isPending || reviewFlag.isPending || payoutAction.isPending || kycAction.isPending

  const renderOverview = () => <div className="flex flex-col gap-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Metric label="Participant accounts" value={number(summary.participant_count)} detail="Current non-deleted records" /><Metric label="Funded accounts" value={number(summary.funded_accounts)} detail={currency(summary.funded_capital) + " initial funded capital"} tone="positive" /><Metric label="Open positions" value={number(summary.open_positions)} detail={`${number(summary.pending_orders)} pending orders in the trade ledger`} /><Metric label="Reserved margin" value={currency(summary.used_margin)} detail="Sum of margin stored on open positions" /><Metric label="Risk alerts" value={number(Number(summary.open_risk_flags ?? 0) + Number(summary.breached_accounts ?? 0))} detail={`${number(summary.open_risk_flags)} open risk flags · ${number(summary.breached_accounts)} funded breaches`} tone={Number(summary.open_risk_flags ?? 0) + Number(summary.breached_accounts ?? 0) ? "warning" : "default"} /><Metric label="Frozen accounts" value={number(summary.frozen_accounts)} detail={`${number(summary.pending_payouts)} payout reviews · ${number(summary.pending_kyc)} KYC reviews`} /></div>
    <Card className="border-border/70 bg-card/80"><CardHeader><SectionHeader title="Operations snapshot" description="Priorities are calculated from the current database records." action={<Button size="sm" variant="outline" onClick={() => setActiveTab("risk")}>Open risk desk <ArrowUpRight data-icon="inline-end" /></Button>} /></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-red-500/25 bg-red-500/5 p-4"><div className="flex items-center gap-2 text-red-300"><AlertTriangle data-icon="inline-start" /> Funded breaches</div><p className="mt-3 text-2xl font-semibold">{number(summary.breached_accounts)}</p><p className="mt-1 text-xs text-muted-foreground">Stored breach state or balance at/below the 2% funded drawdown floor.</p></div><div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-center gap-2 text-amber-300"><Banknote data-icon="inline-start" /> Payout reviews</div><p className="mt-3 text-2xl font-semibold">{number(pendingPayouts)}</p><p className="mt-1 text-xs text-muted-foreground">Pending, matched, or approved requests from payout records.</p></div><div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4"><div className="flex items-center gap-2 text-cyan-300"><Database data-icon="inline-start" /> Database feed</div><p className="mt-3 text-base font-semibold">Connected</p><p className="mt-1 text-xs text-muted-foreground">Last refreshed {latestSync}. Auto-refreshes every 30 seconds.</p></div></CardContent></Card>
    <Card className="border-border/70 bg-card/80"><CardHeader><SectionHeader title="Open trades" description="Latest persisted open and pending positions; market quotes are not stored in this feed." action={<Button size="sm" variant="outline" onClick={() => setActiveTab("positions")}>View all positions <ArrowUpRight data-icon="inline-end" /></Button>} /></CardHeader><CardContent className="p-0">{data?.positions.length ? <PositionTable rows={data.positions.slice(0, 8)} onClose={closeForTrader} busy={actionBusy} /> : <EmptyState>No open positions or pending orders are recorded.</EmptyState>}</CardContent></Card>
  </div>

  const renderAccountTypes = () => <div className="flex flex-col gap-5"><SectionHeader title="Account types and funded capital" description="There is no challenge-plan catalog table in this project. These totals are grouped from real participant account types and stored funded balances." /><TableFrame minWidth="min-w-[560px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Account type</th><th className="p-3">Accounts</th><th className="p-3">Recorded balance</th><th className="p-3">Funded initial capital</th></tr></thead><tbody>{data?.accountTypes.map((row, index) => <tr key={`${row.account_type}-${index}`} className="border-t border-border/60"><td className="p-3 font-medium capitalize">{text(row.account_type).replaceAll("_", " ")}</td><td className="p-3">{number(row.accounts)}</td><td className="p-3">{currency(row.account_balance)}</td><td className="p-3">{currency(row.funded_capital)}</td></tr>)}{!data?.accountTypes.length && <tr><td colSpan={4}><EmptyState>No participant account types are recorded.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderAccounts = () => <div className="flex flex-col gap-5"><SectionHeader title="Trading accounts" description="Participant accounts with funded access or persisted forex trade history. Account controls act on the internal trade ledger." /><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search aria-hidden="true" className="absolute left-3 top-2.5 text-muted-foreground" /><Input aria-label="Search trading accounts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or account ID" className="bg-card pl-9" /></div><Button variant="outline" onClick={() => refresh()} disabled={room.isFetching}><RefreshCw data-icon="inline-start" className={room.isFetching ? "animate-spin" : ""} />Refresh</Button></div><TableFrame minWidth="min-w-[880px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Trader</th><th className="p-3">Account type</th><th className="p-3">Balance</th><th className="p-3">Funded base</th><th className="p-3">Open</th><th className="p-3">Risk state</th><th className="p-3">Action</th></tr></thead><tbody>{filteredAccounts.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3"><p className="font-medium">{text(row.trader)}</p><p className="text-xs text-muted-foreground">{text(row.email)}{row.serial_number ? ` · #${row.serial_number}` : ""}</p></td><td className="p-3 capitalize">{text(row.account_type).replaceAll("_", " ")}</td><td className="p-3 tabular-nums">{currency(row.account_balance)}</td><td className="p-3 tabular-nums">{Number(row.funded_initial_balance) > 0 ? currency(row.funded_initial_balance) : "—"}</td><td className="p-3">{number(row.open_positions)} positions · {number(row.pending_orders)} pending</td><td className="p-3"><StatusBadge status={row.funded_breach_status === "breached" ? "breached" : row.frozen ? "frozen" : row.is_active ? "active" : "inactive"} /></td><td className="p-3">{Number(row.open_positions) > 0 ? <Button size="sm" variant="destructive" disabled={actionBusy} onClick={() => closeForTrader(String(row.email))}>Close ledger trades</Button> : <span className="text-xs text-muted-foreground">No open trades</span>}</td></tr>)}{filteredAccounts.length === 0 && <tr><td colSpan={7}><EmptyState>No matching funded or trading accounts.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderRisk = () => <div className="flex flex-col gap-5"><SectionHeader title="Risk and breaches" description="Live open risk flags and funded drawdown states. Reviewing a risk flag records the admin and timestamp." /><div className="grid gap-3 sm:grid-cols-3"><Metric label="Open risk flags" value={number(summary.open_risk_flags)} detail="Unreviewed records in trade_risk_flags" tone={Number(summary.open_risk_flags) ? "warning" : "default"} /><Metric label="Funded breaches" value={number(summary.breached_accounts)} detail="Stored breach status or at/below the 2% floor" tone={Number(summary.breached_accounts) ? "danger" : "default"} /><Metric label="Frozen accounts" value={number(summary.frozen_accounts)} detail="Account or trading freeze state" /></div><TableFrame minWidth="min-w-[820px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Trader</th><th className="p-3">Flag</th><th className="p-3">Severity</th><th className="p-3">Trade</th><th className="p-3">Detected</th><th className="p-3">Action</th></tr></thead><tbody>{data?.riskFlags.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3">{text(row.participant_email)}</td><td className="p-3">{text(row.flag_type)}</td><td className="p-3"><StatusBadge status={row.severity} /></td><td className="p-3 font-mono text-xs">{text(row.trade_id)}</td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" disabled={actionBusy} onClick={() => reviewFlag.mutate({ id: String(row.id), status: "reviewed" })}>Review</Button><Button size="sm" variant="outline" disabled={actionBusy} onClick={() => reviewFlag.mutate({ id: String(row.id), status: "dismissed" })}>Dismiss</Button></div></td></tr>)}{!data?.riskFlags.length && <tr><td colSpan={6}><EmptyState>No open trade risk flags.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderPositions = () => <div className="flex flex-col gap-5"><SectionHeader title="Live positions and pending orders" description="Current stored trade records. Entry, stop, target, margin, and timestamps come from the database; live market price and floating P&L are not available in this feed." action={<Button variant="outline" onClick={() => refresh()} disabled={room.isFetching}><RefreshCw data-icon="inline-start" className={room.isFetching ? "animate-spin" : ""} />Refresh</Button>} /><Card className="border-border/70 bg-card/80"><CardContent className="p-0">{data?.positions.length ? <PositionTable rows={data.positions} onClose={closeForTrader} busy={actionBusy} /> : <EmptyState>No open positions or pending orders are recorded.</EmptyState>}</CardContent></Card></div>

  const renderPerformance = () => <div className="flex flex-col gap-5"><SectionHeader title="Trading performance" description="Calculated from closed trade records updated in the last 30 days. Open-position P&L is excluded because market quotes are not stored by the admin feed." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Closed trades" value={number(performance.trades)} detail={`${number(performance.wins)} wins · ${number(performance.losses)} losses`} /><Metric label="Win rate" value={`${number(performance.win_rate, 1)}%`} detail="Wins divided by closed trades" tone="positive" /><Metric label="Profit factor" value={performance.profit_factor == null ? "—" : number(performance.profit_factor, 2)} detail="Gross winning P&L / gross losing P&L" /><Metric label="Net realized P&L" value={currency(performance.net_pnl)} detail="Recorded closed-trade P&L · 30 days" tone={Number(performance.net_pnl) >= 0 ? "positive" : "danger"} /><Metric label="Average win" value={currency(performance.average_win)} detail={`Average loss ${currency(performance.average_loss)}`} /></div><Card className="border-border/70 bg-card/80"><CardHeader><SectionHeader title="Recent closed trades" description="Most recently updated closed forex trade records." /></CardHeader><CardContent className="p-0"><ClosedTradesTable rows={data?.history ?? []} /></CardContent></Card></div>

  const renderPayouts = () => <div className="flex flex-col gap-5"><SectionHeader title="Payout requests" description="Requests are read from the payout queue. Marking a request as processing changes its real status; it does not send funds." /><TableFrame minWidth="min-w-[840px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Request</th><th className="p-3">Trader</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody>{data?.payouts.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3 font-mono text-xs">{text(row.id).slice(0, 12)}</td><td className="p-3">{text(row.trader)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td><td className="p-3 font-semibold">{currency(row.amount)}</td><td className="p-3">{text(row.payout_method)}</td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td><td className="p-3">{["pending", "matched", "approved"].includes(String(row.status)) ? <Button size="sm" disabled={actionBusy} onClick={() => payoutAction.mutate({ id: String(row.id) })}>Mark processing</Button> : <span className="text-xs text-muted-foreground">No action</span>}</td></tr>)}{!data?.payouts.length && <tr><td colSpan={7}><EmptyState>No payout requests are recorded.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderPayments = () => <div className="flex flex-col gap-5"><SectionHeader title="Payment submissions" description="Recent submitted payment records from the live payment queue. No seeded rows or simulated verification actions are shown." /><TableFrame minWidth="min-w-[780px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Submission</th><th className="p-3">Participant</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr></thead><tbody>{data?.payments.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3 font-mono text-xs">{text(row.id).slice(0, 12)}</td><td className="p-3">{text(row.participant_email)}</td><td className="p-3">{currency(row.amount)}</td><td className="p-3">{text(row.payment_method)}</td><td className="p-3 font-mono text-xs">{text(row.transaction_id)}</td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td></tr>)}{!data?.payments.length && <tr><td colSpan={7}><EmptyState>No payment submissions are recorded.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderKyc = () => <div className="flex flex-col gap-5"><SectionHeader title="KYC review" description="Live verification records. Start review or approve a pending record; each change is persisted and added to the admin activity log." /><TableFrame minWidth="min-w-[900px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Applicant</th><th className="p-3">Country</th><th className="p-3">Document</th><th className="p-3">Status</th><th className="p-3">Submitted</th><th className="p-3">Reviewer</th><th className="p-3">Action</th></tr></thead><tbody>{data?.kyc.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3">{text(row.legal_name)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td><td className="p-3">{text(row.country)}</td><td className="p-3">{text(row.document_type)}</td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.submitted_at)}</td><td className="p-3">{text(row.reviewed_by)}</td><td className="p-3">{["pending", "under_review"].includes(String(row.status)) ? <div className="flex gap-2">{row.status === "pending" && <Button size="sm" variant="outline" disabled={actionBusy} onClick={() => kycAction.mutate({ id: String(row.id), status: "under_review" })}>Start review</Button>}<Button size="sm" disabled={actionBusy} onClick={() => kycAction.mutate({ id: String(row.id), status: "approved" })}>Approve</Button></div> : <span className="text-xs text-muted-foreground">Finalized</span>}</td></tr>)}{!data?.kyc.length && <tr><td colSpan={7}><EmptyState>No KYC records are recorded.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderUsers = () => <div className="flex flex-col gap-5"><SectionHeader title="Participants" description="Participant identities and account status from the live application database." /><TableFrame minWidth="min-w-[760px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Participant</th><th className="p-3">Account type</th><th className="p-3">Balance</th><th className="p-3">Status</th><th className="p-3">Last seen</th><th className="p-3">Created</th></tr></thead><tbody>{data?.users.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3">{text(row.trader)}<p className="text-xs text-muted-foreground">{text(row.email)}</p></td><td className="p-3 capitalize">{text(row.account_type).replaceAll("_", " ")}</td><td className="p-3">{currency(row.account_balance)}</td><td className="p-3"><StatusBadge status={row.is_frozen || row.account_frozen ? "frozen" : row.is_active ? "active" : "inactive"} /></td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.last_seen)}</td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td></tr>)}{!data?.users.length && <tr><td colSpan={6}><EmptyState>No participant records are available.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderAudit = () => <div className="flex flex-col gap-5"><SectionHeader title="Admin activity log" description="Latest persisted privileged actions, including actor, target, and recorded details." /><TableFrame minWidth="min-w-[800px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">Target</th><th className="p-3">Details</th></tr></thead><tbody>{data?.auditLogs.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td><td className="p-3 font-medium">{text(row.action)}</td><td className="p-3">{text(row.actor_email)}</td><td className="p-3">{text(row.target_type)}{row.target_id ? ` · ${row.target_id}` : ""}</td><td className="max-w-[32rem] p-3 text-xs text-muted-foreground">{text(row.details)}</td></tr>)}{!data?.auditLogs.length && <tr><td colSpan={5}><EmptyState>No admin activity has been recorded.</EmptyState></td></tr>}</tbody></TableFrame></div>

  const renderFeed = () => <div className="flex flex-col gap-5"><SectionHeader title="Data and broker connectivity" description="Connectivity is reported honestly from available services; the app database is not an MT5 execution bridge." /><div className="grid gap-4 md:grid-cols-2"><Card className="border-border/70 bg-card/80"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-cyan-300" />Trading database</CardTitle><CardDescription>Project Neon database read by the admin API.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><StatusBadge status={room.isError ? "unavailable" : "Connected"} /></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Last successful read</span><span className="text-right text-xs">{latestSync}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Refresh cadence</span><span className="text-xs">30 seconds</span></div><Button variant="outline" onClick={() => refresh()} disabled={room.isFetching}><RefreshCw data-icon="inline-start" className={room.isFetching ? "animate-spin" : ""} />Refresh feed</Button></CardContent></Card><Card className="border-amber-500/30 bg-amber-500/5"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cable className="size-4 text-amber-300" />External broker bridge</CardTitle><CardDescription>MT5 Manager or another broker execution adapter.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Connection</span><StatusBadge status="Not configured" /></div><p className="text-sm leading-relaxed text-muted-foreground">No broker bridge credentials or endpoint are configured in this project. Trade rows and admin closures affect the internal ledger only; this screen cannot send orders to an external broker or retrieve live market quotes.</p></CardContent></Card></div></div>

  const content: Record<TabKey, () => React.ReactNode> = {
    overview: renderOverview,
    plans: renderAccountTypes,
    accounts: renderAccounts,
    risk: renderRisk,
    positions: renderPositions,
    performance: renderPerformance,
    payouts: renderPayouts,
    payments: renderPayments,
    kyc: renderKyc,
    users: renderUsers,
    audit: renderAudit,
    broker: renderFeed,
  }

  return <Card className="border-border/70 bg-card/50"><CardHeader className="gap-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle className="text-xl">Trading operations control room</CardTitle><CardDescription>Database-backed account, risk, position, performance, payout, and review records.</CardDescription></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="w-fit border-cyan-500/30 bg-cyan-500/10 text-cyan-300"><ShieldCheck data-icon="inline-start" />Protected admin workspace</Badge><Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{room.isError ? "Feed stale" : "Live database feed"}</Badge><Button size="sm" variant="outline" onClick={() => refresh()} disabled={room.isFetching}><RefreshCw data-icon="inline-start" className={room.isFetching ? "animate-spin" : ""} />Refresh</Button></div></div>{room.isError && data && <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">Refresh failed; showing the last successful data from {latestSync}.</p>}<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/40 p-1"><div className="flex min-w-max gap-1">{navItems.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="gap-2 text-xs"><Icon data-icon="inline-start" />{label}{id === "risk" && Number(summary.open_risk_flags) > 0 ? <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">{number(summary.open_risk_flags)}</span> : id === "payouts" && pendingPayouts > 0 ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">{pendingPayouts}</span> : id === "kyc" && pendingKyc > 0 ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">{pendingKyc}</span> : null}</TabsTrigger>)}</div></TabsList>{navItems.map(({ id }) => <TabsContent key={id} value={id} className="mt-5">{content[id]()}</TabsContent>)}</Tabs></CardHeader></Card>
}

function PositionTable({ rows, onClose, busy }: { rows: Row[]; onClose: (email: string) => void; busy: boolean }) {
  return <TableFrame minWidth="min-w-[1050px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Trader</th><th className="p-3">Instrument</th><th className="p-3">Side / status</th><th className="p-3">Lots</th><th className="p-3">Entry</th><th className="p-3">Stop / target</th><th className="p-3">Margin</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3">{text(row.trader)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td><td className="p-3 font-semibold">{text(row.pair)}</td><td className="p-3"><span className={row.direction === "BUY" ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>{text(row.direction)}</span><div className="mt-1"><StatusBadge status={row.status} /></div></td><td className="p-3 font-mono">{number(row.lot_size, 2)}</td><td className="p-3 font-mono text-xs">{number(row.status === "pending" ? row.target_price : row.open_price, 5)}</td><td className="p-3 font-mono text-xs">{optionalNumber(row.sl)} / {optionalNumber(row.tp)}</td><td className="p-3">{currency(row.margin)}</td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.updated_at ?? row.created_at)}</td><td className="p-3">{row.status === "open" ? <Button size="sm" variant="destructive" disabled={busy} onClick={() => onClose(String(row.participant_email))}>Close account trades</Button> : <span className="text-xs text-muted-foreground">Pending order</span>}</td></tr>)}</tbody></TableFrame>
}

function ClosedTradesTable({ rows }: { rows: Row[] }) {
  return <TableFrame minWidth="min-w-[860px]"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Trade</th><th className="p-3">Trader</th><th className="p-3">Instrument</th><th className="p-3">Side</th><th className="p-3">Lots</th><th className="p-3">Entry / close</th><th className="p-3">Realized P&amp;L</th><th className="p-3">Closed</th></tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)} className="border-t border-border/60"><td className="p-3 font-mono text-xs">{text(row.id).slice(0, 14)}</td><td className="p-3">{text(row.participant_email)}</td><td className="p-3 font-semibold">{text(row.pair)}</td><td className="p-3">{text(row.direction)}</td><td className="p-3">{number(row.lot_size, 2)}</td><td className="p-3 font-mono text-xs">{number(row.open_price, 5)} / {number(row.close_price, 5)}</td><td className={`p-3 font-semibold ${Number(row.final_pnl) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{currency(row.final_pnl)}</td><td className="p-3 text-xs text-muted-foreground">{dateTime(row.close_time ?? row.recorded_at)}</td></tr>)}{rows.length === 0 && <tr><td colSpan={8}><EmptyState>No closed trade records are available.</EmptyState></td></tr>}</tbody></TableFrame>
}

export function AdminControlRoom() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true } } }))
  return <QueryClientProvider client={queryClient}><ControlRoomContent /></QueryClientProvider>
}

export default AdminControlRoom
