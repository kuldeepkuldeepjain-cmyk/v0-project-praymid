"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Wallet,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  balance_before: number
  balance_after: number
  created_at: string
  status: string
}

interface UserLedger {
  participant_id: string
  participant_email: string
  participant_name: string
  current_balance: number
  transactions: Transaction[]
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  approved:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rejected:  "bg-red-500/10 text-red-400 border-red-500/20",
  failed:    "bg-red-500/10 text-red-400 border-red-500/20",
}

export function UserLedgerView() {
  const { toast } = useToast()
  const [searchEmail, setSearchEmail] = useState("")
  const [ledger, setLedger] = useState<UserLedger | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchUserLedger = async (email: string) => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter a participant email to search.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-ledger?email=${encodeURIComponent(email.trim())}`)
      const json = await res.json()

      if (!json.success || !json.participant) {
        toast({ title: "Not found", description: "No participant with that email.", variant: "destructive" })
        return
      }

      const participant = json.participant
      const transactions = json.transactions || []
      const contributions = json.contributions || []
      const payouts = json.payouts || []

      const all: Transaction[] = [
        ...(transactions ?? []).map((tx: any) => ({
          id: tx.id,
          type: tx.type || "transaction",
          amount: tx.amount,
          description: tx.description || tx.type || "Transaction",
          balance_before: tx.balance_before ?? 0,
          balance_after: tx.balance_after ?? 0,
          created_at: tx.created_at,
          status: tx.status || "completed",
        })),
        ...(contributions ?? [])
          .filter((c: any) => c.status === "approved")
          .map((c: any) => ({
            id: c.id,
            type: "contribution",
            amount: 180,
            description: "Contribution approved — $180 credited",
            balance_before: 0,
            balance_after: 0,
            created_at: c.created_at,
            status: c.status,
          })),
        ...(payouts ?? [])
          .filter((p: any) => p.status === "completed")
          .map((p: any) => ({
            id: p.id,
            type: "payout",
            amount: -p.amount,
            description: `Payout of $${p.amount} processed`,
            balance_before: 0,
            balance_after: 0,
            created_at: p.created_at,
            status: p.status,
          })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setLedger({
        participant_id: participant.id,
        participant_email: participant.email,
        participant_name: participant.full_name || participant.username || "Unknown",
        current_balance: participant.account_balance,
        transactions: all,
      })
      setOpen(true)
    } catch {
      toast({ title: "Error", description: "Failed to fetch ledger.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="bg-slate-900 border-slate-700/60 shadow-none">
        <CardHeader className="px-5 py-4 border-b border-slate-700/60">
          <CardTitle className="text-sm font-semibold text-white">User Ledger Lookup</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Enter participant email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUserLedger(searchEmail)}
                className="pl-9 h-9 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={() => fetchUserLedger(searchEmail)}
              disabled={loading}
              size="sm"
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "View"}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Shows all contributions, payouts, and transactions for the searched participant.
          </p>
        </CardContent>
      </Card>

      {/* Ledger Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-700/60 shrink-0">
            <DialogTitle className="text-base font-semibold text-white">
              {ledger?.participant_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              {ledger?.participant_email}
            </DialogDescription>
          </DialogHeader>

          {/* Balance strip */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 border-b border-slate-700/40 shrink-0">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">Current Balance</span>
              <span className="text-sm font-bold text-white">${ledger?.current_balance.toFixed(2)}</span>
            </div>
            <span className="text-xs text-slate-500">
              {ledger?.transactions.length} transaction{ledger?.transactions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Transaction list */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
            {ledger?.transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32">
                <DollarSign className="h-8 w-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">No transactions</p>
              </div>
            )}
            {ledger?.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {tx.amount < 0
                      ? <ArrowDownCircle className="h-4 w-4 text-red-400" />
                      : tx.type === "payout"
                        ? <ArrowDownCircle className="h-4 w-4 text-red-400" />
                        : <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {tx.balance_before > 0 && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        ${tx.balance_before.toFixed(2)} → ${tx.balance_after.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 capitalize ${STATUS_STYLES[tx.status?.toLowerCase()] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
                  >
                    {tx.status}
                  </Badge>
                  <span className={`text-sm font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
