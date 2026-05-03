"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRight, Search, TrendingUp, Users, DollarSign, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PayoutFlow {
  payout_id: string
  payout_requester_email: string
  payout_requester_name: string
  payout_requester_serial: string
  payout_amount: number
  payout_status: string
  payout_created_at: string
  contributor_email: string
  contributor_name: string
  contributor_serial: string
  contribution_amount: number
  contribution_created_at: string
  wallet_address: string
}

export function PayoutTrackerPanel() {
  const [payoutFlows, setPayoutFlows] = useState<PayoutFlow[]>([])
  const [filteredFlows, setFilteredFlows] = useState<PayoutFlow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPayoutFlows()
  }, [])

  useEffect(() => {
    filterFlows()
  }, [searchQuery, payoutFlows])

  const fetchPayoutFlows = async () => {
    try {
      const res = await fetch("/api/admin/payout-tracker")
      const data = await res.json()
      if (data.success) {
        setPayoutFlows(data.flows || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error fetching payout flows:", error)
      toast({ title: "Error", description: "Failed to load payout tracker data", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const filterFlows = () => {
    if (!searchQuery) {
      setFilteredFlows(payoutFlows)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = payoutFlows.filter(
      (flow) =>
        flow.payout_requester_serial.toLowerCase().includes(query) ||
        flow.contributor_serial.toLowerCase().includes(query) ||
        flow.payout_requester_name.toLowerCase().includes(query) ||
        flow.contributor_name.toLowerCase().includes(query) ||
        flow.payout_requester_email.toLowerCase().includes(query) ||
        flow.contributor_email.toLowerCase().includes(query)
    )
    setFilteredFlows(filtered)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Payout Tracker</h2>
        <p className="text-slate-600 mt-1">Track which user's contribution funds which user's payout</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Flows</p>
                <p className="text-2xl font-bold text-slate-800">{payoutFlows.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Contributors</p>
                <p className="text-2xl font-bold text-slate-800">
                  {new Set(payoutFlows.map((f) => f.contributor_serial)).size}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Volume</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${(payoutFlows.reduce((sum, f) => sum + f.payout_amount, 0)).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout Flow Details</CardTitle>
              <CardDescription>See which user's contribution funds which user's payout request</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search serial, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Clock className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500">Loading payout flows...</p>
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">No payout flows found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-rose-50">
                    <TableHead className="font-semibold text-orange-600">Payout Requester</TableHead>
                    <TableHead className="font-semibold text-purple-600 text-center">Flow</TableHead>
                    <TableHead className="font-semibold text-cyan-600">Contributor</TableHead>
                    <TableHead className="font-semibold text-green-600">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-600">Wallet Address</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlows.map((flow) => (
                    <TableRow key={flow.payout_id} className="hover:bg-slate-50">
                      {/* Payout Requester */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono text-xs">
                              {flow.payout_requester_serial}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700">{flow.payout_requester_name}</p>
                          <p className="text-xs text-slate-500">{flow.payout_requester_email}</p>
                        </div>
                      </TableCell>

                      {/* Flow Indicator */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
                          <ArrowRight className="h-5 w-5 text-purple-600 animate-pulse" />
                          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">$100 → ${flow.payout_amount}</p>
                      </TableCell>

                      {/* Contributor */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-mono text-xs">
                              {flow.contributor_serial}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700">{flow.contributor_name}</p>
                          <p className="text-xs text-slate-500">{flow.contributor_email}</p>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-green-600">${flow.payout_amount.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">Payout Amount</p>
                        </div>
                      </TableCell>

                      {/* Wallet Address */}
                      <TableCell>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">
                          {flow.wallet_address.slice(0, 8)}...{flow.wallet_address.slice(-6)}
                        </code>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                          {flow.payout_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
