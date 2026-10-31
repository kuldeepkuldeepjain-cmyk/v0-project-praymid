"use client"

import { useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BookOpen,
  Check,
  FileClock,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AccountTypeBadge } from "@/components/admin/account-type-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { adminFetch } from "@/lib/auth"

type TabKey = "overview" | "accounts" | "risk" | "positions" | "performance" | "payouts" | "payments" | "kyc" | "audit"
type Row = Record<string, unknown>
type OverviewData = { generatedAt: string; summary: Row; positions: Row[] }
type SectionData = { generatedAt: string } & Record<string, unknown>

const navItems: Array<{ id: TabKey; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "accounts", label: "Trading accounts", icon: Users },
  { id: "risk", label: "Risk & breaches", icon: ShieldCheck },
  { id: "positions", label: "Live positions", icon: ArrowUpRight },
  { id: "performance", label: "Performance", icon: BookOpen },
  { id: "payouts", label: "Payouts", icon: Banknote },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "kyc", label: "KYC review", icon: Check },
  { id: "audit", label: "Audit logs", icon: FileClock },
]

const currency = (value: unknown) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value ?? 0))
const number = (value: unknown, digits = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number(value ?? 0))
const optionalNumber = (value: unknown, digits = 5) => (value == null || value === "" ? "—" : number(value, digits))
const dateTime = (value: unknown) => (value ? new Date(String(value)).toLocaleString() : "—")
const text = (value: unknown, fallback = "—") => (value == null || value === "" ? fallback : String(value))

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
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-12 text-center text-sm text-muted-foreground">{children}</div>
}

function TableFrame({ children, minWidth = "min-w-[720px]" }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className={`w-full ${minWidth} text-left text-sm`}>{children}</table>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <span className="sr-only">Loading control room data</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-border/70 bg-muted/30" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-lg border border-border/70 bg-muted/20" />
    </div>
  )
}

function ErrorState({ message, onRetry, busy }: { message: string; onRetry: () => void; busy: boolean }) {
  return (
    <Card className="border-red-500/30 bg-card/80">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div>
          <p className="font-semibold text-foreground">Live trading data could not be loaded</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry} disabled={busy}>
          <RefreshCw data-icon="inline-start" className={busy ? "animate-spin" : ""} />
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

async function requestJSON(path: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await adminFetch(path, { ...init, signal: controller.signal })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.success) throw new Error(result.error || "The request could not be completed.")
    return result
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The control room took too long to respond. Check the database connection and retry.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const loadSection = (section: TabKey) => requestJSON(`/api/admin/trading-control-room?section=${section}`)

function ControlRoomContent() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [kycImage, setKycImage] = useState<{ url: string; label: string; applicant: string } | null>(null)
  const [search, setSearch] = useState("")

  const queryOptions = {
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  } as const

  const overview = useQuery({
    queryKey: ["control-room", "overview"],
    queryFn: () => loadSection("overview"),
    ...queryOptions,
  })

  const section = useQuery({
    queryKey: ["control-room", activeTab],
    queryFn: () => loadSection(activeTab),
    enabled: activeTab !== "overview",
    ...queryOptions,
  })

  const activeQuery = activeTab === "overview" ? overview : section
  const overviewData = overview.data as OverviewData | undefined
  const sectionData = section.data as SectionData | undefined
  const summary = overviewData?.summary ?? {}
  const latestSync = overviewData?.generatedAt ? dateTime(overviewData.generatedAt) : "Not yet synced"

  const reloadAfterAction = () => queryClient.invalidateQueries({ queryKey: ["control-room"] })

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
  const rejectPayment = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "reject-payment", paymentId: id, reason }) }),
    onSuccess: () => { toast({ title: "Payment rejected", description: "The reason was saved with the payment record." }); reloadAfterAction() },
    onError: (error) => toast({ title: "Payment rejection failed", description: error.message, variant: "destructive" }),
  })
  const kycAction = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "under_review" | "approved" | "rejected"; reason?: string }) => requestJSON("/api/admin/trading-control-room", { method: "POST", body: JSON.stringify({ action: "review-kyc", verificationId: id, status, reason }) }),
    onSuccess: () => { toast({ title: "KYC record updated" }); reloadAfterAction() },
    onError: (error) => toast({ title: "KYC update failed", description: error.message, variant: "destructive" }),
  })

  const accounts = (sectionData?.accounts ?? []) as Row[]
  const filteredAccounts = useMemo(
    () => accounts.filter((account) => `${account.id} ${account.trader} ${account.email}`.toLowerCase().includes(search.toLowerCase())),
    [accounts, search],
  )

  const closeForTrader = (email: string) => {
    const confirmed = window.confirm(`Close every open ledger trade for ${email}? The existing admin action records closure at the stored entry price with zero realized P&L. This does not reach an external broker.`)
    if (confirmed) closeTrades.mutate(email)
  }

  const rejectPaymentWithReason = (id: string) => {
    const reason = window.prompt("Enter the rejection reason (required):")?.trim()
    if (!reason || reason.length < 5) {
      if (reason !== undefined) toast({ title: "Rejection reason required", description: "Enter at least 5 characters.", variant: "destructive" })
      return
    }
    rejectPayment.mutate({ id, reason })
  }

  const actionBusy = closeTrades.isPending || reviewFlag.isPending || payoutAction.isPending || kycAction.isPending
  const performance = (sectionData?.performance ?? {}) as Row

  const renderOverview = () => (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Participant accounts" value={number(summary.participant_count)} detail="Current non-deleted records" />
        <Metric label="Funded accounts" value={number(summary.funded_accounts)} detail={`${currency(summary.funded_capital)} initial funded capital`} tone="positive" />
        <Metric label="Open positions" value={number(summary.open_positions)} detail={`${number(summary.pending_orders)} pending orders in the trade ledger`} />
        <Metric label="Reserved margin" value={currency(summary.used_margin)} detail="Sum of margin stored on open positions" />
        <Metric
          label="Risk alerts"
          value={number(Number(summary.open_risk_flags ?? 0) + Number(summary.breached_accounts ?? 0))}
          detail={`${number(summary.open_risk_flags)} open risk flags · ${number(summary.breached_accounts)} funded breaches`}
          tone={Number(summary.open_risk_flags ?? 0) + Number(summary.breached_accounts ?? 0) ? "warning" : "default"}
        />
        <Metric label="Frozen accounts" value={number(summary.frozen_accounts)} detail={`${number(summary.pending_payouts)} payout reviews · ${number(summary.pending_kyc)} KYC reviews`} />
      </div>
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <SectionHeader
            title="Open trades"
            description="Latest persisted open and pending positions; market quotes are not stored in this feed."
            action={<Button size="sm" variant="outline" onClick={() => setActiveTab("positions")}>View all positions <ArrowUpRight data-icon="inline-end" /></Button>}
          />
        </CardHeader>
        <CardContent className="p-0">
          {overviewData?.positions.length
            ? <PositionTable rows={overviewData.positions} onClose={closeForTrader} busy={actionBusy} />
            : <EmptyState>No open positions or pending orders are recorded.</EmptyState>}
        </CardContent>
      </Card>
    </div>
  )

  const renderAccounts = () => (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Trading accounts" description="Participant accounts with funded access or persisted forex trade history. Account controls act on the internal trade ledger." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input aria-label="Search trading accounts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or account ID" className="bg-card pl-9" />
        </div>
        <Button variant="outline" onClick={() => section.refetch()} disabled={section.isFetching}>
          <RefreshCw data-icon="inline-start" className={section.isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
      <TableFrame minWidth="min-w-[880px]">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Trader</th>
            <th className="p-3">Account type</th>
            <th className="p-3">Balance</th>
            <th className="p-3">Funded base</th>
            <th className="p-3">Open</th>
            <th className="p-3">Risk state</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredAccounts.map((row) => (
            <tr key={String(row.id)} className="border-t border-border/60">
              <td className="p-3">
                <p className="font-medium">{text(row.trader)}</p>
                <p className="text-xs text-muted-foreground">{text(row.email)}{row.serial_number ? ` · #${row.serial_number}` : ""}</p>
              </td>
              <td className="p-3"><AccountTypeBadge accountType={row.account_type} /></td>
              <td className="p-3 tabular-nums">{currency(row.account_balance)}</td>
              <td className="p-3 tabular-nums">{Number(row.funded_initial_balance) > 0 ? currency(row.funded_initial_balance) : "—"}</td>
              <td className="p-3">{number(row.open_positions)} positions · {number(row.pending_orders)} pending</td>
              <td className="p-3"><StatusBadge status={row.funded_breach_status === "breached" ? "breached" : row.frozen ? "frozen" : row.is_active ? "active" : "inactive"} /></td>
              <td className="p-3">
                {Number(row.open_positions) > 0
                  ? <Button size="sm" variant="destructive" disabled={actionBusy} onClick={() => closeForTrader(String(row.email))}>Close trades</Button>
                  : <span className="text-xs text-muted-foreground">No open trades</span>}
              </td>
            </tr>
          ))}
          {!filteredAccounts.length && <tr><td colSpan={7}><EmptyState>No trading accounts match this search.</EmptyState></td></tr>}
        </tbody>
      </TableFrame>
    </div>
  )

  const renderRisk = () => {
    const riskFlags = (sectionData?.riskFlags ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Risk and breaches" description="Live open risk flags and funded drawdown states. Reviewing a risk flag records the admin and timestamp." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Open risk flags" value={number(summary.open_risk_flags)} detail="Unreviewed records in trade_risk_flags" tone={Number(summary.open_risk_flags) ? "warning" : "default"} />
          <Metric label="Funded breaches" value={number(summary.breached_accounts)} detail="Stored breach status or at/below the 2% floor" tone={Number(summary.breached_accounts) ? "danger" : "default"} />
          <Metric label="Frozen accounts" value={number(summary.frozen_accounts)} detail="Account or trading freeze state" />
        </div>
        <TableFrame minWidth="min-w-[820px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Trader</th>
              <th className="p-3">Flag</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Trade</th>
              <th className="p-3">Detected</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {riskFlags.map((row) => (
              <tr key={String(row.id)} className="border-t border-border/60">
                <td className="p-3">{text(row.participant_email)}</td>
                <td className="p-3">{text(row.flag_type)}</td>
                <td className="p-3"><StatusBadge status={row.severity} /></td>
                <td className="p-3 font-mono text-xs">{text(row.trade_id)}</td>
                <td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionBusy} onClick={() => reviewFlag.mutate({ id: String(row.id), status: "reviewed" })}>Review</Button>
                    <Button size="sm" variant="outline" disabled={actionBusy} onClick={() => reviewFlag.mutate({ id: String(row.id), status: "dismissed" })}>Dismiss</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!riskFlags.length && <tr><td colSpan={6}><EmptyState>No open trade risk flags.</EmptyState></td></tr>}
          </tbody>
        </TableFrame>
      </div>
    )
  }

  const renderPositions = () => {
    const positions = (sectionData?.positions ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader
          title="Live positions and pending orders"
          description="Current stored trade records. Entry, stop, target, margin, and timestamps come from the database; live market price and floating P&L are not available in this feed."
          action={<Button variant="outline" onClick={() => section.refetch()} disabled={section.isFetching}><RefreshCw data-icon="inline-start" className={section.isFetching ? "animate-spin" : ""} />Refresh</Button>}
        />
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-0">
            {positions.length ? <PositionTable rows={positions} onClose={closeForTrader} busy={actionBusy} /> : <EmptyState>No open positions or pending orders are recorded.</EmptyState>}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPerformance = () => {
    const history = (sectionData?.history ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Trading performance" description="Calculated from closed trade records updated in the last 30 days. Open-position P&L is excluded because market quotes are not stored by the admin feed." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Closed trades" value={number(performance.trades)} detail={`${number(performance.wins)} wins · ${number(performance.losses)} losses`} />
          <Metric label="Win rate" value={`${number(performance.win_rate, 1)}%`} detail="Wins divided by closed trades" tone="positive" />
          <Metric label="Profit factor" value={performance.profit_factor == null ? "—" : number(performance.profit_factor, 2)} detail="Gross winning P&L / gross losing P&L" />
          <Metric label="Net realized P&L" value={currency(performance.net_pnl)} detail="Recorded closed-trade P&L · 30 days" tone={Number(performance.net_pnl) >= 0 ? "positive" : "danger"} />
          <Metric label="Average win" value={currency(performance.average_win)} detail={`Average loss ${currency(performance.average_loss)}`} />
        </div>
        <Card className="border-border/70 bg-card/80">
          <CardHeader><SectionHeader title="Recent closed trades" description="Most recently updated closed forex trade records." /></CardHeader>
          <CardContent className="p-0"><ClosedTradesTable rows={history} /></CardContent>
        </Card>
      </div>
    )
  }

  const renderPayouts = () => {
    const payouts = (sectionData?.payouts ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Payout requests" description="Requests are read from the payout queue. Marking a request as processing changes its real status; it does not send funds." />
        <TableFrame minWidth="min-w-[840px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Request</th>
              <th className="p-3">Trader</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={String(row.id)} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{text(row.id).slice(0, 12)}</td>
                <td className="p-3">{text(row.trader)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td>
                <td className="p-3 font-semibold">{currency(row.amount)}</td>
                <td className="p-3">{text(row.payout_method)}</td>
                <td className="p-3"><StatusBadge status={row.status} /></td>
                <td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td>
                <td className="p-3">
                  {["pending", "matched", "approved"].includes(String(row.status))
                    ? <Button size="sm" disabled={actionBusy} onClick={() => payoutAction.mutate({ id: String(row.id) })}>Mark processing</Button>
                    : <span className="text-xs text-muted-foreground">No action</span>}
                </td>
              </tr>
            ))}
            {!payouts.length && <tr><td colSpan={7}><EmptyState>No payout requests are recorded.</EmptyState></td></tr>}
          </tbody>
        </TableFrame>
      </div>
    )
  }

  const renderPayments = () => {
    const payments = (sectionData?.payments ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Payment submissions" description="Recent submitted payment records from the live payment queue." />
        <TableFrame minWidth="min-w-[780px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Submission</th>
              <th className="p-3">Participant</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Action / reason</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={String(row.id)} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{text(row.id).slice(0, 12)}</td>
                <td className="p-3">{text(row.participant_email)}</td>
                <td className="p-3">{currency(row.amount)}</td>
                <td className="p-3">{text(row.payment_method)}</td>
                <td className="p-3 font-mono text-xs">{text(row.transaction_id)}</td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                  {row.rejection_reason ? <p className="mt-1 max-w-52 text-xs text-red-300">{text(row.rejection_reason)}</p> : null}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td>
                <td className="p-3">
                  {["pending", "under_review"].includes(String(row.status))
                    ? <Button size="sm" variant="destructive" disabled={actionBusy} onClick={() => rejectPaymentWithReason(String(row.id))}>Reject payment</Button>
                    : <span className="text-xs text-muted-foreground">Finalized</span>}
                </td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={8}><EmptyState>No payment submissions are recorded.</EmptyState></td></tr>}
          </tbody>
        </TableFrame>
      </div>
    )
  }

  const renderKyc = () => {
    const kyc = (sectionData?.kyc ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="KYC review" description="Review the full document front, back, live selfie, and document number before approving a verification record." />
        <TableFrame minWidth="min-w-[900px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Applicant</th>
              <th className="p-3">Country</th>
              <th className="p-3">Document</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Reviewer</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {kyc.map((row) => (
              <tr key={String(row.id)} className="border-t border-border/60">
                <td className="p-3">{text(row.legal_name)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td>
                <td className="p-3">{text(row.country)}</td>
                <td className="p-3">
                  <div className="capitalize font-medium">{text(row.document_type)}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">No. {text(row.document_number) || "Not provided"}</div>
                  <div className="mt-2 flex gap-1.5">
                    {[["Front", row.document_front_url], ["Back", row.document_back_url], ["Selfie", row.selfie_url]].map(([label, url]) =>
                      url ? (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={() => setKycImage({ url: String(url), label: String(label), applicant: text(row.legal_name) })}
                          className="group relative block overflow-hidden rounded-md border border-border/70 bg-muted/30"
                        >
                          <img src={String(url)} alt={`${label} identity document`} className="h-12 w-16 object-cover transition group-hover:scale-105" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-center text-[8px] text-white">View {String(label)}</span>
                        </button>
                      ) : (
                        <span key={String(label)} className="rounded-md border border-dashed border-border px-1.5 py-1 text-[9px] text-muted-foreground">No {String(label).toLowerCase()}</span>
                      ),
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                  {row.rejection_reason ? <p className="mt-1 max-w-52 text-xs text-red-300">{text(row.rejection_reason)}</p> : null}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{dateTime(row.submitted_at)}</td>
                <td className="p-3 text-xs text-muted-foreground">{text(row.reviewed_by)}</td>
                <td className="p-3">
                  {["pending", "under_review"].includes(String(row.status)) ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={actionBusy} onClick={() => kycAction.mutate({ id: String(row.id), status: "approved" })}>Approve</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionBusy}
                        onClick={() => {
                          const reason = window.prompt("Reason for rejection (required):")?.trim()
                          if (!reason || reason.length < 5) return
                          kycAction.mutate({ id: String(row.id), status: "rejected", reason })
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Finalized</span>}
                </td>
              </tr>
            ))}
            {!kyc.length && <tr><td colSpan={7}><EmptyState>No KYC submissions are recorded.</EmptyState></td></tr>}
          </tbody>
        </TableFrame>
      </div>
    )
  }

  const renderAudit = () => {
    const auditLogs = (sectionData?.auditLogs ?? []) as Row[]
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Admin activity log" description="Latest persisted privileged actions, including actor, target, and recorded details." />
        <TableFrame minWidth="min-w-[800px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Action</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Target</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((row) => (
              <tr key={String(row.id)} className="border-t border-border/60">
                <td className="p-3 text-xs text-muted-foreground">{dateTime(row.created_at)}</td>
                <td className="p-3 font-medium">{text(row.action)}</td>
                <td className="p-3">{text(row.actor_email)}</td>
                <td className="p-3">{text(row.target_type)}{row.target_id ? ` · ${row.target_id}` : ""}</td>
                <td className="max-w-[32rem] p-3 text-xs text-muted-foreground">{text(row.details)}</td>
              </tr>
            ))}
            {!auditLogs.length && <tr><td colSpan={5}><EmptyState>No admin activity has been recorded.</EmptyState></td></tr>}
          </tbody>
        </TableFrame>
      </div>
    )
  }

  const renderKycPreview = () => kycImage ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`${kycImage.label} preview`} onClick={() => setKycImage(null)}>
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{kycImage.label} · {kycImage.applicant}</p>
            <p className="text-xs text-muted-foreground">Full-size KYC review image</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setKycImage(null)} aria-label="Close image preview"><X className="size-4" /></Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/40 p-3">
          <img src={kycImage.url} alt={`${kycImage.label} full-size identity document`} className="max-h-[75vh] max-w-full object-contain" />
        </div>
      </div>
    </div>
  ) : null

  const renderActive = () => {
    if (activeQuery.isPending) return <LoadingRows />
    if (activeQuery.isError) {
      return (
        <ErrorState
          message={activeQuery.error instanceof Error ? activeQuery.error.message : "Check your admin session and database connection, then retry."}
          onRetry={() => activeQuery.refetch()}
          busy={activeQuery.isFetching}
        />
      )
    }
    switch (activeTab) {
      case "accounts": return renderAccounts()
      case "risk": return renderRisk()
      case "positions": return renderPositions()
      case "performance": return renderPerformance()
      case "payouts": return renderPayouts()
      case "payments": return renderPayments()
      case "kyc": return renderKyc()
      case "audit": return renderAudit()
      default: return renderOverview()
    }
  }

  return (
    <>
      <Card className="border-border/70 bg-card/50">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/40 p-1 lg:w-auto">
                <div className="flex min-w-max gap-1">
                  {navItems.map(({ id, label, icon: Icon }) => (
                    <TabsTrigger key={id} value={id} className="gap-2 text-xs">
                      <Icon data-icon="inline-start" />
                      {label}
                      {id === "risk" && Number(summary.open_risk_flags) > 0
                        ? <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">{number(summary.open_risk_flags)}</span>
                        : id === "payouts" && Number(summary.pending_payouts) > 0
                          ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">{number(summary.pending_payouts)}</span>
                          : id === "kyc" && Number(summary.pending_kyc) > 0
                            ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">{number(summary.pending_kyc)}</span>
                            : null}
                    </TabsTrigger>
                  ))}
                </div>
              </TabsList>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">Synced {latestSync}</span>
                <Button size="sm" variant="outline" onClick={() => activeQuery.refetch()} disabled={activeQuery.isFetching}>
                  <RefreshCw data-icon="inline-start" className={activeQuery.isFetching ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>
            </div>
            <TabsContent value={activeTab} className="mt-5">{renderActive()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {renderKycPreview()}
    </>
  )
}

function PositionTable({ rows, onClose, busy }: { rows: Row[]; onClose: (email: string) => void; busy: boolean }) {
  return (
    <TableFrame minWidth="min-w-[1050px]">
      <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="p-3">Trader</th>
          <th className="p-3">Instrument</th>
          <th className="p-3">Side / status</th>
          <th className="p-3">Lots</th>
          <th className="p-3">Entry</th>
          <th className="p-3">Stop / target</th>
          <th className="p-3">Margin</th>
          <th className="p-3">Updated</th>
          <th className="p-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.id)} className="border-t border-border/60">
            <td className="p-3">{text(row.trader)}<p className="text-xs text-muted-foreground">{text(row.participant_email)}</p></td>
            <td className="p-3 font-semibold">{text(row.pair)}</td>
            <td className="p-3">
              <span className={row.direction === "BUY" ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>{text(row.direction)}</span>
              <div className="mt-1"><StatusBadge status={row.status} /></div>
            </td>
            <td className="p-3 font-mono">{number(row.lot_size, 2)}</td>
            <td className="p-3 font-mono text-xs">{number(row.status === "pending" ? row.target_price : row.open_price, 5)}</td>
            <td className="p-3 font-mono text-xs">{optionalNumber(row.sl)} / {optionalNumber(row.tp)}</td>
            <td className="p-3">{currency(row.margin)}</td>
            <td className="p-3 text-xs text-muted-foreground">{dateTime(row.updated_at ?? row.created_at)}</td>
            <td className="p-3">
              {row.status === "open"
                ? <Button size="sm" variant="destructive" disabled={busy} onClick={() => onClose(String(row.participant_email))}>Close account trades</Button>
                : <span className="text-xs text-muted-foreground">Pending order</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  )
}

function ClosedTradesTable({ rows }: { rows: Row[] }) {
  return (
    <TableFrame minWidth="min-w-[860px]">
      <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="p-3">Trade</th>
          <th className="p-3">Trader</th>
          <th className="p-3">Instrument</th>
          <th className="p-3">Side</th>
          <th className="p-3">Lots</th>
          <th className="p-3">Entry / close</th>
          <th className="p-3">Realized P&amp;L</th>
          <th className="p-3">Closed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.id)} className="border-t border-border/60">
            <td className="p-3 font-mono text-xs">{text(row.id).slice(0, 14)}</td>
            <td className="p-3">{text(row.participant_email)}</td>
            <td className="p-3 font-semibold">{text(row.pair)}</td>
            <td className="p-3">{text(row.direction)}</td>
            <td className="p-3">{number(row.lot_size, 2)}</td>
            <td className="p-3 font-mono text-xs">{number(row.open_price, 5)} / {number(row.close_price, 5)}</td>
            <td className={`p-3 font-semibold ${Number(row.final_pnl) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{currency(row.final_pnl)}</td>
            <td className="p-3 text-xs text-muted-foreground">{dateTime(row.close_time ?? row.recorded_at)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={8}><EmptyState>No closed trade records are available.</EmptyState></td></tr>}
      </tbody>
    </TableFrame>
  )
}

export function AdminControlRoom() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))
  return <QueryClientProvider client={queryClient}><ControlRoomContent /></QueryClientProvider>
}

export default AdminControlRoom
