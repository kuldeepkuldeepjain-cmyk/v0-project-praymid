"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Copy, Search, Filter, Download, Mail, Phone, Globe, Shield, Wallet, Hash } from "lucide-react"
import type { ParticipantProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { CreateAdminDialog } from "@/components/create-admin-dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonTable } from "@/components/ui/skeleton-loader"
import { UserRankBadge } from "@/components/user-rank-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ParticipantWithActivity = ParticipantProfile & {
  participantNumber?: number
  username?: string
  email?: string
  name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  password?: string
  role?: string
  status?: "active" | "inactive" | "suspended"
  totalGiven: number
  totalReceived: number
  pendingRequests: number
  completedTransactions: number
  participation_count?: number
  activation_fee_paid?: boolean
  wallet_balance?: number
  contributed_amount?: number
  wallet_address?: string
}

type ParticipantsTableProps = {
  participants: ParticipantWithActivity[]
  onViewDetails: (participant: ParticipantWithActivity) => void
  isLoading?: boolean
}

function getRank(participationCount: number): "bronze" | "silver" | "gold" | "platinum" {
  if (participationCount >= 30) return "platinum"
  if (participationCount >= 15) return "gold"
  if (participationCount >= 5) return "silver"
  return "bronze"
}

export function ParticipantsTable({ participants, onViewDetails, isLoading }: ParticipantsTableProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    })
  }

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery) ||
      p.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participantNumber?.toString().includes(searchQuery)

    const matchesRole = roleFilter === "all" || p.role === roleFilter
    const matchesStatus = statusFilter === "all" || p.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const exportToCSV = () => {
    const headers = [
      "Number",
      "Username",
      "Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Country",
      "Role",
      "Status",
      "Wallet Balance",
      "Contributed Amount",
      "Total Given",
      "Total Received",
      "Participations",
      "Activation Paid",
    ]
    const rows = filteredParticipants.map((p) => [
      p.participantNumber?.toString() || "",
      p.username || "",
      p.name || "",
      p.email || "",
      p.phone || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.country || "",
      p.role || "",
      p.status || "",
      (p.wallet_balance || 0).toString(),
      (p.contributed_amount || 0).toString(),
      p.totalGiven.toString(),
      p.totalReceived.toString(),
      p.participation_count?.toString() || "0",
      p.activation_fee_paid ? "Yes" : "No",
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `participants-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({
      title: "Exported!",
      description: `${filteredParticipants.length} participants exported to CSV`,
    })
  }

  if (isLoading) {
    return <SkeletonTable rows={5} />
  }

  return (
    <Card className="glass rounded-2xl mt-6 border-0 shadow-lg overflow-hidden animate-slide-up-fade">
      <CardHeader className="pb-4 bg-gradient-to-r from-[#E85D3B]/5 to-[#f97316]/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-xl font-bold gradient-text-coral">Participants</CardTitle>
            <CardDescription className="text-gray-600">Manage and view all registered participants</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <CreateAdminDialog />
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="bg-gradient-to-r from-[#E85D3B]/10 to-[#f97316]/10 text-[#E85D3B] hover:from-[#E85D3B]/20 hover:to-[#f97316]/20 font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-[#E85D3B]/20 rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, email, phone, country, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 focus:border-[#E85D3B] focus:ring-2 focus:ring-[#E85D3B]/20 shadow-sm transition-all duration-300 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200 shadow-xl backdrop-blur-sm animate-scale-in rounded-xl">
                <DropdownMenuLabel className="text-gray-700 font-semibold">Filter by Role</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  onClick={() => setRoleFilter("all")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter("participant")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  Participants
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter("admin")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  Admins
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200 shadow-xl backdrop-blur-sm animate-scale-in rounded-xl">
                <DropdownMenuLabel className="text-gray-700 font-semibold">Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("active")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("inactive")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  Inactive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("suspended")}
                  className="text-gray-900 hover:bg-gray-100 font-medium transition-colors duration-200"
                >
                  Suspended
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredParticipants.length === 0 ? (
          <div className="p-6">
            <EmptyState
              type="users"
              title="No participants found"
              description="Try adjusting your search or filters to find what you're looking for."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#E85D3B]/10 via-white to-[#f97316]/10 border-b-2 border-gray-300 hover:from-[#E85D3B]/20 hover:to-[#f97316]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#E85D3B]/20 relative">
                  <TableHead className="font-bold text-gray-900 text-sm w-20">#</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm">User Information</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm">Contact Details</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm">Location</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm text-right">Wallet Balance</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm text-right">Contributed</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm">Rank</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm">Status</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm text-right">Activity</TableHead>
                  <TableHead className="font-bold text-gray-900 text-sm text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant, index) => (
                  <TableRow
                    key={participant.id}
                    className="group border-none hover:bg-gradient-to-r hover:from-[#E85D3B]/20 hover:to-[#f97316]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#E85D3B]/20 relative"
                  >
                    {/* Number */}
                    <TableCell className="py-4">
                      <Badge className="font-mono text-sm font-bold bg-gradient-to-r from-[#E85D3B] to-[#f97316] text-white border-0 shadow-md hover:shadow-lg group-hover:scale-110 transition-all duration-300 px-3 py-1">
                        <Hash className="h-3.5 w-3.5 mr-1" />
                        {participant.participantNumber || index + 100}
                      </Badge>
                    </TableCell>

                    {/* User Info */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                            {participant.name || <span className="text-gray-400/50 italic">No name</span>}
                          </span>
                          {participant.activation_fee_paid && (
                            <Badge className="text-xs px-2 py-0.5 bg-gradient-to-r from-[#E85D3B] to-[#f97316] text-white border-0 font-semibold shadow-sm group-hover:animate-pulse-soft">
                              Activated
                            </Badge>
                          )}
                        </div>
                        {participant.username && (
                          <span className="text-sm text-gray-700 font-semibold">@{participant.username}</span>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Wallet className="h-3.5 w-3.5 text-gray-400/60" />
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded group-hover:bg-gray-200 transition-colors duration-200">
                            {participant.wallet_address?.slice(0, 6)}...{participant.wallet_address?.slice(-4)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100/10 transition-all duration-300"
                            onClick={() => copyToClipboard(participant.wallet_address!, "Wallet")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400/60 group-hover:text-gray-700 transition-colors duration-300" />
                          <span className="text-sm text-gray-900 font-medium">{participant.email || "—"}</span>
                          {participant.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100/10 transition-all duration-300"
                              onClick={() => copyToClipboard(participant.email!, "Email")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400/60 group-hover:text-gray-700 transition-colors duration-300" />
                          <span className="text-sm text-gray-900 font-medium">{participant.phone || "—"}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400/60 group-hover:text-gray-700 transition-colors duration-300" />
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 font-medium">{participant.country || "—"}</span>
                          {(participant.city || participant.state) && (
                            <span className="text-xs text-gray-600">
                              {[participant.city, participant.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Wallet Balance */}
                    <TableCell className="text-right py-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                          ${(participant.wallet_balance || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-600/60">Balance</span>
                      </div>
                    </TableCell>

                    {/* Contributed Amount */}
                    <TableCell className="text-right py-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                          ${(participant.contributed_amount || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-600/60">Contributed</span>
                      </div>
                    </TableCell>

                    {/* Rank */}
                    <TableCell className="py-4">
                      <UserRankBadge rank={getRank(participant.participation_count || 0)} size="sm" showLabel />
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-4">
                      <StatusBadge status={participant.status || "active"} />
                    </TableCell>

                    {/* Activity */}
                    <TableCell className="text-right py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-semibold text-gray-900">
                          ${participant.totalGiven.toFixed(0)}
                        </span>
                        <span className="text-xs text-gray-600">{participant.completedTransactions} transactions</span>
                        <span className="text-xs text-gray-600">
                          {participant.participation_count || 0} participations
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100/10 hover:scale-110 transition-all duration-300 hover:shadow-lg hover:shadow-[#f97316]/20"
                        onClick={() => onViewDetails(participant)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-t border-gray-200/60 text-sm bg-gradient-to-r from-[#E85D3B]/5 to-[#f97316]/5">
          <span className="text-gray-600">
            Showing <span className="text-gray-900 font-medium">{filteredParticipants.length}</span> of{" "}
            <span className="text-gray-900 font-medium">{participants.length}</span> participants
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
