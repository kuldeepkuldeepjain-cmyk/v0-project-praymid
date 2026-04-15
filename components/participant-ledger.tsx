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
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LedgerEntry {
  id: string
  type: "transaction" | "contribution" | "payout" | "prediction" | "topup"
  subType: string
  amount: number
  status: string
  date: string
  description: string
  [key: string]: any
}

interface LedgerProps {
  participantId: string
}

const TYPE_STYLES: Record<string, string> = {
  contribution: "bg-blue-50 text-blue-700 border-blue-200",
  payout:       "bg-purple-50 text-purple-700 border-purple-200",
  transaction:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  prediction:   "bg-orange-50 text-orange-700 border-orange-200",
  topup:        "bg-cyan-50 text-cyan-700 border-cyan-200",
}

const STATUS_STYLES: Record<string, string> = {
  completed:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  success:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:         "bg-amber-50 text-amber-700 border-amber-200",
  processing:      "bg-amber-50 text-amber-700 border-amber-200",
  request_pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected:        "bg-red-50 text-red-700 border-red-200",
  failed:          "bg-red-50 text-red-700 border-red-200",
  cancelled:       "bg-red-50 text-red-700 border-red-200",
}

export function ParticipantLedger({ participantId }: LedgerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const limit = 15
  const { toast } = useToast()

  useEffect(() => { fetchLedger() }, [participantId, filterType, sortOrder, currentPage])

  const fetchLedger = async () => {
    setLoading(true)
    try {
      const offset = currentPage * limit
      const res = await fetch(
        `/api/participant/ledger?participantId=${participantId}&type=${filterType}&sortBy=date&order=${sortOrder}&limit=${limit}&offset=${offset}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch ledger")
      setEntries(data.data || [])
      setTotalEntries(data.pagination?.total || 0)
    } catch {
      toast({ title: "Error", description: "Failed to load ledger", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalEntries / limit)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <Card className="border border-slate-200 shadow-none bg-white">
      <CardHeader className="px-5 py-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Transaction Ledger</CardTitle>
            {!loading && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {totalEntries} records
              </span>
            )}
          </div>

          {/* Inline filters */}
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(0) }}>
              <SelectTrigger className="h-8 text-xs w-36 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              className="h-8 px-2.5 text-xs border-slate-200 gap-1.5"
              onClick={() => { setSortOrder((o) => o === "desc" ? "asc" : "desc"); setCurrentPage(0) }}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <FileText className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="text-xs font-semibold text-slate-500 py-2.5 pl-5">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 py-2.5">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 py-2.5">Description</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 py-2.5 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 py-2.5 pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="py-2.5 pl-5">
                        <div className="text-xs font-medium text-slate-700">{formatDate(entry.date)}</div>
                        <div className="text-xs text-slate-400">{formatTime(entry.date)}</div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2 py-0 capitalize ${TYPE_STYLES[entry.type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 max-w-[220px]">
                        <p className="text-xs text-slate-700 truncate">{entry.description}</p>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.type === "payout" || entry.amount < 0
                            ? <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                            : <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          }
                          <span className={`text-xs font-bold ${entry.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 pr-5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2 py-0 capitalize ${STATUS_STYLES[entry.status?.toLowerCase()] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-slate-200"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-slate-200"
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
