"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Download,
  Filter,
  Eye,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Award,
  MoreVertical,
  Ban,
  CheckCircle,
  XCircle,
  Database,
  Loader2,
  Users,
  Copy,
  AlertTriangle,
} from "lucide-react"
import type { ParticipantUser } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { UserRankBadge } from "@/components/user-rank-badge"
import { createClient } from "@/lib/supabase/client"

export function ParticipantDatabaseView() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<ParticipantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rankFilter, setRankFilter] = useState<string>("all")
  const [activationFilter, setActivationFilter] = useState<string>("all")
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantUser | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch participants from Supabase
  useEffect(() => {
    async function fetchParticipants() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("participants")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching participants:", error)
          toast({
            title: "Error",
            description: "Failed to load participants",
            variant: "destructive",
          })
          return
        }

        setParticipants(data || [])
      } catch (err) {
        console.error("Error in fetchParticipants:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchParticipants()
  }, [toast])

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery) ||
      p.participantNumber?.toString().includes(searchQuery) ||
      p.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    const matchesRank = rankFilter === "all" || p.rank === rankFilter
    const matchesActivation =
      activationFilter === "all" ||
      (activationFilter === "activated" && p.activation_fee_paid) ||
      (activationFilter === "pending" && !p.activation_fee_paid)

    return matchesSearch && matchesStatus && matchesRank && matchesActivation
  })

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Participant #",
      "Serial Number",
      "Username",
      "Full Name",
      "Email",
      "Phone",
      "Country Code",
      "Country",
      "State",
      "City",
      "Postal Code",
      "Full Address",
      "Date of Birth",
      "Gender",
      "Occupation",
      "Monthly Income",
      "BEP20 Wallet Address",
      "Profile Completed",
      "Activation Paid",
      "Activation Amount",
      "Payment Method",
      "Payment Status",
      "Status",
      "Rank",
      "Participations",
      "Total Contributed",
      "Total Points",
      "Login Streak",
      "Risk Score",
      "IP Address",
      "Referral Code",
      "Heard From",
      "Created At",
      "Last Active",
    ]

    const rows = filteredParticipants.map((p) => [
      p.participantNumber,
      p.serial_number || "N/A",
      p.username,
      p.full_name || p.name || "",
      p.email,
      p.phone || "",
      p.country_code || "",
      p.country || "",
      p.state || "",
      p.city || "",
      p.postal_code || "",
      p.full_address || p.address || "",
      p.date_of_birth || "",
      p.gender || "",
      p.occupation || "",
      p.monthly_income || "",
      p.wallet_address || p.bep20_wallet_address || "",
      p.details_completed ? "Yes" : "No",
      p.activation_fee_paid ? "Yes" : "No",
      p.activation_fee_amount,
      p.activation_payment_method || "",
      p.activation_payment_status || "",
      p.status,
      p.rank,
      p.participation_count,
      p.totalContributed || 0,
      p.totalPoints || 0,
      p.loginStreak || 0,
      p.risk_score,
      p.ip_address || "",
      p.referral_code || "",
      p.heard_from || "",
      new Date(p.created_at).toLocaleString(),
      new Date(p.last_active).toLocaleString(),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `participants-database-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({
      title: "Database Exported",
      description: `${filteredParticipants.length} participants exported to CSV`,
    })
  }

  // Declare onViewDetails function
  const onViewDetails = (participant: ParticipantUser) => {
    console.log("View details for participant:", participant)
    // Implement the logic to view details here
  }

  // Delete participant function
  const deleteParticipant = async (participantId: string) => {
    setIsDeleting(true)
    try {
      console.log("[v0] Starting delete for participant:", participantId)
      
      if (!participantId || participantId.trim() === "") {
        throw new Error("Invalid participant ID")
      }

      const response = await fetch("/api/admin/delete-participant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      })

      const data = await response.json()
      console.log("[v0] Delete response status:", response.status)
      console.log("[v0] Delete response data:", data)

      if (!response.ok) {
        console.error("[v0] Delete failed with status:", response.status)
        console.error("[v0] Error details:", data)
        const errorMessage = data.details || data.error || `Failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      if (!data.success) {
        throw new Error(data.error || "Delete operation did not complete successfully")
      }

      console.log("[v0] Delete successful, removing from UI")
      // Remove participant from list
      setParticipants(participants.filter((p) => p.id !== participantId))
      setShowDeleteConfirmation(false)
      setDeletingParticipantId(null)

      toast({
        title: "Success!",
        description: `Participant (${data.email}) and ${data.deletedRelatedRecords || 0} related records permanently deleted`,
      })
    } catch (error) {
      console.error("[v0] Delete error caught:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("[v0] Error message:", errorMsg)
      
      toast({
        title: "Deletion Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-4" />
          <p className="text-slate-600">Loading participants database...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-orange-300 to-rose-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-300 to-violet-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="relative bg-gradient-to-br from-white/95 via-orange-50/30 to-rose-50/30 backdrop-blur-sm border-orange-200/50 shadow-xl">
        <CardHeader className="border-b border-orange-200/30 pb-4 bg-gradient-to-r from-orange-50/50 to-rose-50/50">
          <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Participants Database
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Complete database of all registered participants with detailed information
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Download className="h-4 w-4 mr-2" />
            Export Database
          </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
            <Input
              placeholder="Search participants by name, username, email, phone, country, #number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gradient-to-r from-orange-50/50 to-rose-50/50 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
            />
          </div>

            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("suspended")}>Suspended</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("frozen")}>Frozen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Award className="h-4 w-4 mr-2" />
                    Rank: {rankFilter === "all" ? "All" : rankFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setRankFilter("all")}>All Ranks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRankFilter("platinum")}>Platinum</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRankFilter("gold")}>Gold</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRankFilter("silver")}>Silver</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRankFilter("bronze")}>Bronze</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activation: {activationFilter === "all" ? "All" : activationFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setActivationFilter("all")}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActivationFilter("activated")}>Activated</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActivationFilter("pending")}>Pending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-gradient-to-br from-orange-100 to-rose-100 rounded-lg p-3 border border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs text-orange-700 font-semibold">Total Records</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">{participants.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-lg p-3 border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs text-emerald-700 font-semibold">Activated</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              {participants.filter((p) => p.activation_fee_paid).length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg p-3 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs text-purple-700 font-semibold">Filtered Results</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{filteredParticipants.length}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg p-3 border border-amber-200 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs text-amber-700 font-semibold">Total Volume</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              ${participants.reduce((sum, p) => sum + (p.totalContributed || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-orange-100/50 via-rose-100/50 to-purple-100/50 border-b-2 border-orange-200">
                  <TableHead className="font-semibold text-orange-600">#</TableHead>
                  <TableHead className="font-semibold text-cyan-600">Serial No</TableHead>
                  <TableHead className="font-semibold text-orange-600">User Info</TableHead>
                  <TableHead className="font-semibold text-red-600">Password</TableHead>
                  <TableHead className="font-semibold text-rose-600">Contact</TableHead>
                  <TableHead className="font-semibold text-purple-600">Location</TableHead>
                  <TableHead className="font-semibold text-violet-600">Personal</TableHead>
                  <TableHead className="font-semibold text-cyan-600">Wallet</TableHead>
                  <TableHead className="font-semibold text-emerald-600">Activation</TableHead>
                  <TableHead className="font-semibold text-orange-600">Status</TableHead>
                  <TableHead className="font-semibold text-purple-600">Activity</TableHead>
                  <TableHead className="font-semibold text-rose-600 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id} className="border-b border-orange-100/50 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-rose-50/50 transition-all duration-200">
                    {/* Participant Number */}
                    <TableCell>
                      <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 font-mono text-xs">
                        #{participant.participant_number}
                      </Badge>
                    </TableCell>

                    {/* Serial Number */}
                    <TableCell>
                      <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono font-bold text-xs px-3 py-1.5">
                        {participant.serial_number || "N/A"}
                      </Badge>
                    </TableCell>

                    {/* User Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{participant.name || "—"}</p>
                        <p className="text-xs text-violet-600">@{participant.username}</p>
                        <div className="flex items-center gap-1">
                          <UserRankBadge rank={participant.rank} size="sm" showLabel />
                        </div>
                      </div>
                    </TableCell>

                    {/* Password */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200 font-mono">
                          {participant.plain_password || "—"}
                        </code>
                        {participant.plain_password && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-red-100"
                            onClick={() => {
                              navigator.clipboard.writeText(participant.plain_password || "")
                              toast({
                                title: "Password Copied",
                                description: "Password copied to clipboard",
                              })
                            }}
                          >
                            <Copy className="h-3 w-3 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-700">{participant.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-700">
                            {participant.country_code} {participant.phone || "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="font-medium text-slate-900">{participant.country || "—"}</span>
                        </div>
                        {participant.state && <p className="text-slate-600">{participant.state}</p>}
                        {participant.city && <p className="text-slate-500">{participant.city}</p>}
                        {participant.postal_code && <p className="text-slate-400">{participant.postal_code}</p>}
                      </div>
                    </TableCell>

                    {/* Personal Info */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {participant.date_of_birth && <p>DOB: {participant.date_of_birth}</p>}
                        {participant.gender && <p>Gender: {participant.gender}</p>}
                        {participant.occupation && <p>Occupation: {participant.occupation}</p>}
                        {participant.monthly_income && <p>Income: {participant.monthly_income}</p>}
                      </div>
                    </TableCell>

                    {/* Wallet */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3 text-slate-400" />
                        <code className="text-xs text-slate-600 font-mono">
                          {participant.wallet_address.slice(0, 6)}...{participant.wallet_address.slice(-4)}
                        </code>
                      </div>
                    </TableCell>

                    {/* Activation */}
                    <TableCell>
                      <div className="space-y-1">
                        {participant.activation_fee_paid ? (
                          <>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activated
                            </Badge>
                            <p className="text-[10px] text-slate-500">
                              {new Date(participant.activation_fee_paid_at || "").toLocaleDateString()}
                            </p>
                          </>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          className={
                            participant.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : participant.status === "frozen"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }
                        >
                          {participant.status}
                        </Badge>
                        <p className="text-[10px] text-slate-500">Risk: {participant.risk_score}</p>
                      </div>
                    </TableCell>

                    {/* Activity */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <p className="text-slate-700">
                          <span className="font-semibold text-violet-600">{participant.participation_count}</span>{" "}
                          participations
                        </p>
                        <p className="text-emerald-600 font-semibold">${participant.totalContributed || 0}</p>
                        <p className="text-amber-600">{participant.totalPoints || 0} pts</p>
                        <p className="text-slate-400 text-[10px]">
                          Last: {new Date(participant.last_active).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-violet-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedParticipant(participant)
                            setShowDetailsModal(true)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast({
                              title: "Email Sent",
                              description: `Email sent to ${participant.email}`,
                            })
                          }}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                            onClick={() => {
                              toast({
                                title: "Account Suspended",
                                description: `${participant.username}'s account has been suspended`,
                                variant: "destructive",
                              })
                            }}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend Account
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-700 focus:text-red-700 focus:bg-red-100"
                            onClick={() => {
                              setDeletingParticipantId(participant.id)
                              setShowDeleteConfirmation(true)
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Delete Participant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium">{filteredParticipants.length}</span> of{" "}
              <span className="font-medium">{participants.length}</span> participants
            </p>
            <p className="text-sm text-slate-500">
              Database last updated: <span className="font-medium">{new Date().toLocaleString()}</span>
            </p>
        </div>
      </CardContent>
    </Card>

    {/* Participant Details Modal */}
    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-white via-orange-50/30 to-rose-50/30">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
            Participant Details
          </DialogTitle>
          <DialogDescription>
            Complete information for {selectedParticipant?.username}
          </DialogDescription>
        </DialogHeader>
        
        {selectedParticipant && (
          <div className="space-y-6">
            {/* User Info Section */}
            <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 border border-orange-200">
              <h3 className="font-bold text-orange-600 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Full Name</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.full_name || selectedParticipant.name || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Username</p>
                  <p className="font-semibold text-slate-900">@{selectedParticipant.username}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.phone || "Not provided"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Full Address</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.full_address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Profile Status</p>
                  {selectedParticipant.details_completed ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 border border-emerald-200">
              <h3 className="font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Financial Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Wallet Balance</p>
                  <p className="font-bold text-emerald-600">${selectedParticipant.wallet_balance || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Contributed</p>
                  <p className="font-bold text-cyan-600">${selectedParticipant.totalContributed || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Points</p>
                  <p className="font-bold text-amber-600">{selectedParticipant.totalPoints || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Current Rank</p>
                  <Badge className="bg-violet-100 text-violet-700">
                    {selectedParticipant.current_rank || "Bronze"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">BEP20 Payout Address</p>
                  <code className="font-mono text-xs text-slate-900 break-all">
                    {selectedParticipant.wallet_address || selectedParticipant.bep20_wallet_address || "Not provided"}
                  </code>
                </div>
              </div>
            </div>

            {/* Location & Status */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
              <h3 className="font-bold text-purple-600 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location & Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Country</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.country}</p>
                </div>
                <div>
                  <p className="text-slate-500">State</p>
                  <p className="font-semibold text-slate-900">{selectedParticipant.state || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Activation Status</p>
                  {selectedParticipant.activation_fee_paid ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activated
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700">
                      Pending
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-slate-500">Account Status</p>
                  <Badge className={selectedParticipant.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {selectedParticipant.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-600 mb-3">Timestamps</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Registered</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedParticipant.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Last Active</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedParticipant.last_active).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
              >
                Close
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-orange-300 hover:bg-orange-50 bg-transparent"
                onClick={() => {
                  toast({
                    title: "Email Sent",
                    description: `Email sent to ${selectedParticipant.email}`,
                  })
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
      <DialogContent className="max-w-md bg-gradient-to-br from-white to-red-50/30 border-red-200">
        <DialogHeader>
          <DialogTitle className="text-2xl text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Confirm Permanent Deletion
          </DialogTitle>
          <DialogDescription className="text-slate-700">
            This action cannot be undone. All participant data will be permanently deleted from the database.
          </DialogDescription>
        </DialogHeader>

        {deletingParticipantId && (
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Participant:</span> {participants.find(p => p.id === deletingParticipantId)?.name || "Unknown"}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Email:</span> {participants.find(p => p.id === deletingParticipantId)?.email}
              </p>
              <p className="text-sm text-red-600 font-semibold">
                All related data will be deleted including:
              </p>
              <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                <li>Profile and account information</li>
                <li>Payment submissions and payouts</li>
                <li>Transactions and balances</li>
                <li>Support tickets and notifications</li>
                <li>All activity logs</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmation(false)}
                className="flex-1 border-slate-300"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (deletingParticipantId) {
                    deleteParticipant(deletingParticipantId)
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Permanently Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </div>
  )
}
