"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Wallet, Copy, ExternalLink, DollarSign, CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

const mockApprovedWallets: ApprovedWallet[] = [
  {
    id: "1",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    participantEmail: "user1@example.com",
    participantName: "John Doe",
    approvedAmount: 100,
    txHash: "0xabc123def456...",
    approvedAt: new Date(Date.now() - 3600000).toISOString(),
    collected: false,
  },
  {
    id: "2",
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    participantEmail: "user2@example.com",
    participantName: "Jane Smith",
    approvedAmount: 100,
    txHash: "0xdef456abc123...",
    approvedAt: new Date(Date.now() - 7200000).toISOString(),
    collected: true,
    collectedAt: new Date(Date.now() - 3000000).toISOString(),
  },
]

export function ApprovedWalletsPanel() {
  const { toast } = useToast()
  const [wallets, setWallets] = useState<ApprovedWallet[]>(mockApprovedWallets)
  const [collectingIds, setCollectingIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

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

    // Simulate transferFrom call
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

  const filteredWallets = wallets.filter(
    (w) =>
      w.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.participantName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const stats = {
    total: wallets.length,
    pending: wallets.filter((w) => !w.collected).length,
    collected: wallets.filter((w) => w.collected).length,
    totalApproved: wallets.reduce((sum, w) => sum + w.approvedAmount, 0),
    totalCollected: wallets.filter((w) => w.collected).reduce((sum, w) => sum + w.approvedAmount, 0),
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Approved Wallets</h1>
        <p className="text-slate-500 text-sm">Manage and collect funds from approved wallet addresses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Approved</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Collection</p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Approved</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">${stats.totalApproved}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Collected</p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">${stats.totalCollected}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-medium text-slate-900">Wallet Approvals</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Wallets that have approved gas fee transactions
              </CardDescription>
            </div>
            <Input
              placeholder="Search wallets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredWallets.map((wallet) => {
              const isCollecting = collectingIds.has(wallet.id)
              return (
                <div
                  key={wallet.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{wallet.participantName}</p>
                      <Badge
                        variant={wallet.collected ? "default" : "secondary"}
                        className={
                          wallet.collected
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }
                      >
                        {wallet.collected ? "Collected" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{wallet.participantEmail}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">
                        {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopyAddress(wallet.walletAddress)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a
                        href={`https://bscscan.com/tx/${wallet.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline flex items-center gap-1"
                      >
                        View TX <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-400">
                      Approved: {new Date(wallet.approvedAt).toLocaleString()}
                      {wallet.collectedAt && ` • Collected: ${new Date(wallet.collectedAt).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-semibold text-emerald-600">${wallet.approvedAmount}</p>
                    {!wallet.collected && (
                      <Button
                        size="sm"
                        onClick={() => handleCollectFunds(wallet.id)}
                        disabled={isCollecting}
                        className="bg-[#E85D3B] hover:bg-[#d14d2c] text-white"
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
            })}

            {filteredWallets.length === 0 && (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No approved wallets found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
