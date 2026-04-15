"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  Search,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LedgerEntry {
  id: string
  participantEmail: string
  participantName: string
  type: "transaction" | "contribution" | "payout" | "prediction" | "topup"
  subType: string
  amount: number
  status: string
  date: string
  description: string
  [key: string]: any
}

const TYPE_STYLES: Record<string, string> = {
  contribution: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  payout:       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  transaction:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  prediction:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
  topup:        "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
}

const STATUS_STYLES: Record<string, string> = {
  completed:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  approved:        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  success:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:         "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing:      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  request_pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rejected:        "bg-red-500/10 text-red-400 border-red-500/20",
  failed:          "bg-red-500/10 text-red-400 border-red-500/20",
  declined:        "bg-red-500/10 text-red-400 border-red-500/20",
}

export function AllParticipantsLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [filterParticipant, setFilterParticipant] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 50
  const { toast } = useToast()

  useEffect(() => { fetchAllLedgers() }, [filterType, filterParticipant, sortOrder, currentPage])

  const fetchAllLedgers = async () => {
    setLoading(true)
    try {
      const offset = currentPage * limit
      const res = await fetch(
        `/api/admin/all-ledger?type=${filterType}&participant=${filterParticipant}&sortBy=date&order=${sortOrder}&limit=${limit}&offset=${offset}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch ledger")
      setEntries(data.data || [])
      setTotalEntries(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)
    } catch {
      toast({ title: "Error", description: "Failed to load ledger", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const rows = [
      ["Date", "Participant", "Email", "Type", "Description", "Amount", "Status"],
      ...entries.map((e) => [
        new Date(e.date).toLocaleDateString(),
        e.participantName,
        e.participantEmail,
        e.type,
        e.description,
        (e.amount >= 0 ? "+" : "") + `$${Math.abs(e.amount).toFixed(2)}`,
        e.status,
      ]),
    ]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n")

    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }))
    a.download = `ledger-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <Card className="bg-slate-900 border-slate-700/60 shadow-none">
      <CardHeader className="px-5 py-4 border-b border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-white">All Participants Ledger</CardTitle>
            {!loading && (
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                {totalEntries} records
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Email or name..."
                value={filterParticipant}
                onChange={(e) => { setFilterParticipant(e.target.value); setCurrentPage(0) }}
                className="pl-8 h-8 w-44 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(0) }}>
              <SelectTrigger className="h-8 text-xs w-36 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="contribution">Contributions</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
                <SelectItem value="transaction">Transactions</SelectItem>
                <SelectItem value="prediction">Predictions</SelectItem>
                <SelectItem value="topup">Top-ups</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 gap-1.5"
              onClick={() => { setSortOrder((o) => o === "desc" ? "asc" : "desc"); setCurrentPage(0) }}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 gap-1.5"
              onClick={exportToCSV}
              disabled={entries.length === 0}
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-slate-500">No transactions found</p>
            <p className="text-xs text-slate-600 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/50 hover:bg-slate-800/50 border-b border-slate-700/60">
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5 pl-5">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5">Participant</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5">Description</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 py-2.5 pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <TableCell className="py-2.5 pl-5">
                        <div className="text-xs font-medium text-slate-300">{formatDate(entry.date)}</div>
                        <div className="text-xs text-slate-500">{formatTime(entry.date)}</div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                          {entry.participantName}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[120px]">
                          {entry.participantEmail}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2 py-0 capitalize ${TYPE_STYLES[entry.type] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 max-w-[200px]">
                        <p className="text-xs text-slate-400 truncate">{entry.description}</p>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.amount < 0
                            ? <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                            : <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          }
                          <span className={`text-xs font-bold ${entry.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 pr-5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2 py-0 capitalize ${STATUS_STYLES[entry.status?.toLowerCase()] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/60">
                <span className="text-xs text-slate-500">Page {currentPage + 1} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
