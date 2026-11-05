"use client"
import { adminFetch } from "@/lib/auth"

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
  Loader2,
  Users,
  Copy,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  RotateCcw,
  Activity,
} from "lucide-react"
import type { ParticipantUser } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AccountTypeBadge } from "@/components/admin/account-type-badge"
import { UserRankBadge } from "@/components/user-rank-badge"
import { ParticipantListControls, ParticipantPagination } from "@/components/admin/participant-list-controls"
function safeDateTime(value?: string | null) {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString()
}

function formatActiveDuration(seconds?: number | null) {
  const totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days) return `${days}d ${hours}h ${minutes}m`
  if (hours) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function ParticipantDatabaseView() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<ParticipantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sort, setSort] = useState("original")
  const [pageSize, setPageSize] = useState(25)
  const [expanded, setExpanded] = useState(false)
  const [pagination, setPagination] = useState({ key: "", page: 1 })
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rankFilter, setRankFilter] = useState<string>("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [activationFilter, setActivationFilter] = useState<string>("all")
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantUser | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpParticipant, setOtpParticipant] = useState<ParticipantUser | null>(null)
  const [otpInput, setOtpInput] = useState("")
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set())
  const [showReactivationModal, setShowReactivationModal] = useState(false)
  const [reactivationParticipant, setReactivationParticipant] = useState<ParticipantUser | null>(null)
  const [reactivationAmount, setReactivationAmount] = useState("")
  const [isReactivating, setIsReactivating] = useState(false)

  const activateParticipant = async (participantId: string, action: "activate" | "deactivate" | "suspend") => {
    setActivatingId(participantId)
    try {
      const res = await adminFetch("/api/admin/activate-participant", {
        method: "POST",
        body: JSON.stringify({ participantId, action }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Success", description: data.message })
        setParticipants(prev =>
          prev.map(p =>
            p.id === participantId
              ? { ...p, status: data.newStatus, is_active: data.newIsActive }
              : p
          )
        )
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" })
    } finally {
      setActivatingId(null)
    }
  }

  const reactivateFundedAccount = async () => {
    if (!reactivationParticipant) return
    const amount = Number(reactivationAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount to add", variant: "destructive" })
      return
    }

    setIsReactivating(true)
    try {
      const res = await adminFetch("/api/admin/reactivate-funded-account", {
        method: "POST",
        body: JSON.stringify({ participantId: reactivationParticipant.id, amount }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ title: "Reactivation failed", description: data.error || "Unable to reactivate account", variant: "destructive" })
        return
      }

      setParticipants((previous) => previous.map((participant) =>
        participant.id === reactivationParticipant.id
          ? {
              ...participant,
              account_balance: data.newBalance,
              wallet_balance: data.newBalance,
              status: data.newStatus,
              is_active: data.newIsActive,
              funded_breach_status: data.fundedBreachStatus,
              account_frozen: false,
              is_frozen: false,
            }
          : participant,
      ))
      toast({ title: "Funded account reactivated", description: data.message })
      setShowReactivationModal(false)
      setReactivationParticipant(null)
      setReactivationAmount("")
    } catch {
      toast({ title: "Error", description: "Reactivation request failed", variant: "destructive" })
    } finally {
      setIsReactivating(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      const res = await adminFetch("/api/admin/participants")
      const data = await res.json().catch(() => null)
      if (!res.ok || !Array.isArray(data?.participants)) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      setParticipants(data.participants)
      setLastUpdated(new Date())
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load participants")
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load participants", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParticipants()
    const refreshInterval = window.setInterval(fetchParticipants, 120_000)
    return () => window.clearInterval(refreshInterval)
  }, [])

  const verifyOtp = async () => {
    if (!otpParticipant || !otpInput.trim()) return
    setIsVerifyingOtp(true)
    try {
      const res = await adminFetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: otpParticipant.id,
          otp: otpInput.trim(),
          adminEmail: "admin",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "OTP Verified!", description: data.message })
        setShowOtpModal(false)
        setOtpInput("")
        fetchParticipants()
      } else {
        toast({ title: "Verification Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Verification request failed", variant: "destructive" })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = [p.full_name, p.name, p.username, p.email, p.phone, p.mobile_number, p.participant_number, p.serial_number, p.country]
      .some(value => String(value ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()))

    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    const matchesRank = rankFilter === "all" || p.rank === rankFilter
    const matchesActivation =
      activationFilter === "all" ||
      (activationFilter === "activated" && p.activation_fee_paid) ||
      (activationFilter === "pending" && !p.activation_fee_paid)

    const matchesAccount = accountFilter === "all" || p.account_type === accountFilter
    return matchesSearch && matchesStatus && matchesRank && matchesActivation && matchesAccount
  })

  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const timestamp = (value?: string | null) => new Date(value || "").getTime() || 0
    if (sort === "name") return (a.full_name || a.name || a.username || "").localeCompare(b.full_name || b.name || b.username || "")
    if (sort === "newest") return timestamp(b.created_at) - timestamp(a.created_at)
    if (sort === "oldest") return timestamp(a.created_at) - timestamp(b.created_at)
    if (sort === "activity") return timestamp(b.last_seen) - timestamp(a.last_seen)
    return 0
  })
  const filterKey = JSON.stringify([searchQuery, statusFilter, rankFilter, accountFilter, activationFilter, sort, pageSize])
  const pages = Math.max(1, Math.ceil(sortedParticipants.length / pageSize))
  const page = pagination.key === filterKey ? Math.min(pagination.page, pages) : 1
  const visibleParticipants = sortedParticipants.slice((page - 1) * pageSize, page * pageSize)

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Participant #",
      "Serial Number",
      "Username",
      "Full Name",
      "Email",
      "Phone",
      "Mobile Number",
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
      p.participant_number || p.id || "N/A",
      p.participant_number || "N/A",
      p.username,
      p.full_name || p.name || "",
      p.email,
      p.mobile_number || p.phone || "",
      p.mobile_number || p.phone || "",
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
      p.last_active ? new Date(p.last_active).toLocaleString() : "Not available",
    ])

    const csvCell = (value: unknown) => {
      const text = String(value ?? "")
      const safe = /^[\s]*[=+\-@\t\r\n]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const csvContent = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n")

    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `participants-database-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    toast({
      title: "Database Exported",
      description: `${filteredParticipants.length} participants exported to CSV`,
    })
  }

  // Delete participant function
  const deleteParticipant = async (participantId: string) => {
    setIsDeleting(true)
    try {
      if (!participantId || participantId.trim() === "") {
        throw new Error("Invalid participant ID")
      }

      const response = await adminFetch("/api/admin/delete-participant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      })

      const data = await response.json()
      if (!response.ok) {
        const errorMessage = data.details || data.error || `Failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      if (!data.success) {
        throw new Error(data.error || "Delete operation did not complete successfully")
      }

      setParticipants((current) => current.filter((p) => p.id !== participantId))
      setShowDeleteConfirmation(false)
      setDeletingParticipantId(null)

      toast({
        title: "Success!",
        description: `Participant (${data.email}) and ${data.deletedRelatedRecords || 0} related records permanently deleted`,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      
      toast({
        title: "Deletion Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading && !lastUpdated) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading participants database...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="participants-workspace min-w-0" data-expanded={expanded}>
      {/* Animated Background Effects removed to keep the workspace focused. */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Users className="size-5 text-primary" />
              Participants Database
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Find an account, review its status, and manage participant access.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={loading} onClick={fetchParticipants}>{loading ? <Loader2 className="animate-spin" /> : <RotateCcw />}{loading ? "Refreshing…" : "Refresh"}</Button>
            <Button onClick={exportToCSV} disabled={!filteredParticipants.length}><Download />Export filtered CSV</Button>
          </div>
          </div>

          {loadError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">{loadError}. Use Refresh to retry.{lastUpdated ? " Previously loaded records may be out of date." : " Participant data is currently unavailable."}</p>}
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search participants"
              placeholder="Search name, email, phone, country, or participant / serial number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                Account
                <select aria-label="Account type" value={accountFilter} onChange={event => setAccountFilter(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-foreground">
                  <option value="all">All account types</option>
                  {Array.from(new Set(participants.map(p => p.account_type).filter((type): type is string => typeof type === "string" && type.length > 0))).sort().map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <p role="status" className="text-sm">{filteredParticipants.length} of {participants.length} participants · Export uses these filters</p>
          {(searchQuery || statusFilter !== "all" || rankFilter !== "all" || activationFilter !== "all" || accountFilter !== "all") && <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setRankFilter("all"); setActivationFilter("all"); setAccountFilter("all") }}>Clear all filters</Button>}
        </div>
        {/* Stats Summary */}
        <dl className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">
          {[
            { label: "Registered accounts", value: participants.length.toLocaleString(), note: "All loaded participants" },
            { label: "Activation paid", value: participants.filter(p => p.activation_fee_paid).length.toLocaleString(), note: "Across all accounts" },
            { label: "Matching filters", value: filteredParticipants.length.toLocaleString(), note: "Included in CSV export" },
            { label: "Total volume", value: `$${participants.reduce((sum, p) => sum + (Number(p.totalContributed) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, note: "All loaded participants" },
          ].map(stat => <div key={stat.label} className="rounded-lg border border-border bg-muted/30 p-4"><dt className="text-sm text-muted-foreground">{stat.label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{stat.value}</dd><dd className="mt-1 text-sm text-muted-foreground">{stat.note}</dd></div>)}
        </dl>
        </CardHeader>

        <CardContent className="p-0">
          <ParticipantListControls sort={sort} onSort={setSort} pageSize={pageSize} onPageSize={setPageSize} expanded={expanded} onExpanded={setExpanded} />
          <div role="region" aria-label="Participant records, scroll horizontally for additional columns" tabIndex={0} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted hover:bg-muted">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serial No</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Info</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Account Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password / PIN</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallet</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activation</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {!visibleParticipants.length && <TableRow><TableCell colSpan={13} className="h-40 text-center"><p className="font-medium text-foreground">{loadError ? "Participant data could not be loaded" : participants.length ? "No participants match these filters" : "No participants yet"}</p><p className="mt-2 text-sm text-muted-foreground">{loadError ? "Refresh to try again." : participants.length ? "Try another name or email, or clear the filters above." : "Registered accounts will appear here."}</p></TableCell></TableRow>}
              {visibleParticipants.map((participant) => (
                <TableRow key={participant.id} className="border-b border-border bg-card text-card-foreground transition-colors hover:bg-muted/40">
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
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <button type="button" className="text-left font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2" onClick={() => { setSelectedParticipant(participant); setShowDetailsModal(true) }}>{participant.full_name || participant.name || participant.username || "View participant"}</button>
                          <span className="inline-flex items-center gap-1 md:hidden">
                            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Type:</span>
                            <AccountTypeBadge accountType={participant.account_type} appearance="light" />
                          </span>
                        </div>
                        <p className="text-xs text-primary">@{participant.username}</p>
                        <div className="flex items-center gap-1">
                          {participant.rank ? <UserRankBadge rank={participant.rank} size="sm" showLabel /> : <span className="text-xs text-muted-foreground">Rank unavailable</span>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Account Type */}
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      <AccountTypeBadge accountType={participant.account_type} appearance="light" />
                    </TableCell>

                    {/* Password */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200 font-mono">
                          {participant.plain_password || "—"}
                        </code>
                        {participant.plain_password && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-100"
                              onClick={() => {
                                setVisiblePasswords((prev) => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(participant.id)) {
                                    newSet.delete(participant.id)
                                  } else {
                                    newSet.add(participant.id)
                                  }
                                  return newSet
                                })
                              }}
                              title={visiblePasswords.has(participant.id) ? "Hide password" : "Show password"}
                            >
                              <Eye className="h-3 w-3 text-red-600" />
                            </Button>
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
                              title="Copy password"
                            >
                              <Copy className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        )}
                        <span className="text-slate-300">/</span>
                        <code className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 font-mono">
                          {participant.pin_code || "—"}
                        </code>
                        {participant.pin_code && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-amber-100"
                              onClick={() => {
                                setVisiblePins((prev) => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(participant.id)) newSet.delete(participant.id)
                                  else newSet.add(participant.id)
                                  return newSet
                                })
                              }}
                              title={visiblePins.has(participant.id) ? "Hide PIN" : "Show PIN"}
                            >
                              <Eye className="h-3 w-3 text-amber-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-amber-100"
                              onClick={() => {
                                navigator.clipboard.writeText(participant.pin_code || "")
                                toast({ title: "PIN Copied", description: "Participant PIN copied to clipboard" })
                              }}
                              title="Copy PIN"
                            >
                              <Copy className="h-3 w-3 text-amber-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">{participant.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">
                            {participant.mobile_number || (participant.country_code ? `${participant.country_code} ${participant.phone}` : participant.phone) || "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">{participant.country || participant.location || "—"}</span>
                        </div>
                        {participant.state && <p className="text-muted-foreground">{participant.state}</p>}
                        {participant.city && <p className="text-muted-foreground">{participant.city}</p>}
                        {participant.postal_code && <p className="text-muted-foreground">{participant.postal_code}</p>}
                      </div>
                    </TableCell>

                    {/* Personal Info */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-foreground">
                        {participant.date_of_birth && <p>DOB: {participant.date_of_birth}</p>}
                        {participant.gender && <p>Gender: {participant.gender}</p>}
                        {participant.occupation && <p>Occupation: {participant.occupation}</p>}
                        {participant.monthly_income && <p>Income: {participant.monthly_income}</p>}
                      </div>
                    </TableCell>

                    {/* Wallet */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <code className="text-xs text-muted-foreground font-mono break-all">
                          {participant.wallet_address}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
                          aria-label={`Copy wallet address for ${participant.username || participant.email}`}
                          disabled={!participant.wallet_address}
                          onClick={() => {
                            navigator.clipboard.writeText(participant.wallet_address)
                            toast({
                              title: "Wallet Address Copied",
                              description: "Full wallet address copied to clipboard",
                            })
                          }}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
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
                            <p className="text-[10px] text-muted-foreground">
                              {safeDateTime(participant.activation_fee_paid_at)}
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
                        {participant.otp_verified ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5" />
                            OTP Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                            OTP Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Activity */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          {participant.last_seen && (Date.now() - new Date(participant.last_seen).getTime() < 5 * 60 * 1000) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Offline
                            </span>
                          )}
                          <span className="font-semibold text-primary">{participant.participation_count}</span>
                          <span className="text-[10px] text-muted-foreground">participations</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">${participant.totalContributed || 0}</span>
                          <span className="text-amber-600 text-[11px] font-medium">{participant.totalPoints || 0} pts</span>
                        </div>

                        <div className="space-y-0.5 text-[10px] text-muted-foreground border-t border-slate-100 pt-1 mt-1">
                          {participant.last_login && (
                            <p className="font-medium text-slate-800">
                              Login: <span className="text-blue-600">{safeDateTime(participant.last_login)}</span>
                            </p>
                          )}
                          {participant.last_seen && (
                            <p>
                              Active: <span className="text-emerald-700 font-medium">{safeDateTime(participant.last_seen)}</span>
                            </p>
                          )}
                          {participant.total_active_seconds !== undefined && participant.total_active_seconds > 0 && (
                            <p className="font-semibold text-purple-700">
                              Time: {formatActiveDuration(participant.total_active_seconds)}
                            </p>
                          )}
                          {participant.ip_address && (
                            <p className="font-mono text-[9px] text-muted-foreground">
                              IP: {participant.ip_address}
                            </p>
                          )}
                          {participant.created_at && (
                            <p className="text-muted-foreground">
                              Joined: {new Date(participant.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" aria-label={`Actions for ${participant.username || participant.email}`}><span>Actions</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedParticipant(participant)
                            setShowDetailsModal(true)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setOtpParticipant(participant)
                              setOtpInput("")
                              setShowOtpModal(true)
                            }}
                            className={participant.otp_verified ? "text-green-600" : "text-amber-600"}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {participant.otp_verified ? "OTP Verified" : "Verify WhatsApp OTP"}
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
                          {participant.account_type === "funded" && participant.funded_breach_status === "breached" && (
                            <DropdownMenuItem
                              className="text-blue-700 focus:text-blue-800 focus:bg-blue-50"
                              onClick={() => {
                                setReactivationParticipant(participant)
                                setReactivationAmount("")
                                setShowReactivationModal(true)
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reactivate + Add Funds
                            </DropdownMenuItem>
                          )}
                          {participant.status !== "active" && (
                            <DropdownMenuItem
                              className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                              disabled={activatingId === participant.id}
                              onClick={() => activateParticipant(participant.id, "activate")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {activatingId === participant.id ? "Activating..." : "Activate Account"}
                            </DropdownMenuItem>
                          )}
                          {participant.status === "active" && (
                            <DropdownMenuItem
                              className="text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                              disabled={activatingId === participant.id}
                              onClick={() => activateParticipant(participant.id, "deactivate")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {activatingId === participant.id ? "Deactivating..." : "Deactivate Account"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                            disabled={activatingId === participant.id}
                            onClick={() => activateParticipant(participant.id, "suspend")}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            {activatingId === participant.id ? "Suspending..." : "Suspend Account"}
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
          <ParticipantPagination page={page} pages={pages} count={filteredParticipants.length} pageSize={pageSize} onPage={value => setPagination({ key: filterKey, page: value })} />
          <p className="px-4 pb-4 text-sm text-muted-foreground">{lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString()} · Refreshes automatically every 2 minutes` : "No successful refresh yet"}. CSV includes all matching participants, not just this page.</p>
      </CardContent>
    </Card>

    {/* Participant Details Modal */}
    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">
            Participant Details
          </DialogTitle>
          <DialogDescription>
            Complete information for {selectedParticipant?.username}
          </DialogDescription>
        </DialogHeader>
        
        {selectedParticipant && (
          <div className="space-y-6">
            {/* User Info Section */}
            <div className="rounded-xl p-4 border border-border bg-muted/30 text-foreground">
              <h3 className="font-bold text-orange-600 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-semibold text-foreground">{selectedParticipant.full_name || selectedParticipant.name || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-semibold text-foreground">@{selectedParticipant.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground">{selectedParticipant.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mobile Number</p>
                  <p className="font-semibold text-foreground">
                    {selectedParticipant.mobile_number || (selectedParticipant.country_code ? `${selectedParticipant.country_code} ${selectedParticipant.phone}` : selectedParticipant.phone) || "Not provided"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Full Address</p>
                  <p className="font-semibold text-foreground">{selectedParticipant.full_address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profile Status</p>
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
            <div className="rounded-xl p-4 border border-border bg-muted/30 text-foreground">
              <h3 className="font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Financial Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Wallet Balance</p>
                  <p className="font-bold text-emerald-600">${selectedParticipant.wallet_balance || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Contributed</p>
                  <p className="font-bold text-cyan-600">${selectedParticipant.totalContributed || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Points</p>
                  <p className="font-bold text-amber-600">{selectedParticipant.totalPoints || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Rank</p>
                  <Badge className="bg-violet-100 text-violet-700">
                    {selectedParticipant.current_rank || "Bronze"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">BEP20 Payout Address</p>
                  <code className="font-mono text-xs text-foreground break-all">
                    {selectedParticipant.wallet_address || selectedParticipant.bep20_wallet_address || "Not provided"}
                  </code>
                </div>
              </div>
            </div>

            {/* Location & Status */}
            <div className="rounded-xl p-4 border border-border bg-muted/30 text-foreground">
              <h3 className="font-bold text-purple-600 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location & Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-semibold text-foreground">{selectedParticipant.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">State</p>
                  <p className="font-semibold text-foreground">{selectedParticipant.state || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Activation Status</p>
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
                  <p className="text-muted-foreground">Account Status</p>
                  <Badge className={selectedParticipant.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {selectedParticipant.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Access & Activity Details */}
            <div className="rounded-xl p-4 border border-border bg-muted/30 text-foreground">
              <h3 className="font-bold text-indigo-700 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Access & Activity
                </span>
                {selectedParticipant.last_seen && (Date.now() - new Date(selectedParticipant.last_seen).getTime() < 5 * 60 * 1000) ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    Online Now
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-slate-300">
                    Offline
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-semibold text-foreground">
                    {safeDateTime(selectedParticipant.last_login)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Active / Heartbeat</p>
                  <p className="font-semibold text-emerald-700">
                    {safeDateTime(selectedParticipant.last_seen || selectedParticipant.last_active)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Active Duration</p>
                  <p className="font-semibold text-purple-700">
                    {formatActiveDuration(selectedParticipant.total_active_seconds)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono font-semibold text-foreground break-all">
                    {selectedParticipant.ip_address || "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registration Date</p>
                  <p className="font-semibold text-foreground">
                    {safeDateTime(selectedParticipant.created_at)}
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

    {/* Funded account reactivation modal */}
    <Dialog open={showReactivationModal} onOpenChange={setShowReactivationModal}>
      <DialogContent className="max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <RotateCcw className="h-5 w-5" />
            Reactivate funded account
          </DialogTitle>
          <DialogDescription>
            Add funds directly and clear the breach lock for this funded account.
          </DialogDescription>
        </DialogHeader>

        {reactivationParticipant && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-blue-100 bg-card text-card-foreground p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account</span>
                <span className="font-semibold text-slate-800">{reactivationParticipant.email}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-semibold text-slate-800">${Number(reactivationParticipant.account_balance || 0).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-red-100 text-red-700">Breach locked</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reactivation-amount" className="text-sm font-medium text-foreground">
                Amount to add directly
              </label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reactivation-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={reactivationAmount}
                  onChange={(event) => setReactivationAmount(event.target.value)}
                  placeholder="Required amount"
                  className="pl-9"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) reactivateFundedAccount()
                  }}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The server will reject amounts that do not restore the account above its 2% drawdown floor.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReactivationModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={reactivateFundedAccount}
                disabled={isReactivating || !reactivationAmount}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                {isReactivating ? "Reactivating..." : "Add Funds & Reactivate"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* OTP Verification Modal */}
    <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
      <DialogContent className="max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl text-green-700 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Verify WhatsApp OTP
          </DialogTitle>
          <DialogDescription>
            Enter the OTP received from participant{" "}
            <span className="font-semibold text-slate-800">{otpParticipant?.name || otpParticipant?.username}</span>
          </DialogDescription>
        </DialogHeader>

        {otpParticipant && (
          <div className="space-y-4 py-2">
            {/* Participant Info */}
            <div className="bg-card text-card-foreground rounded-xl p-4 border border-green-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold text-slate-800">{otpParticipant.full_name || otpParticipant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-semibold text-slate-800">{otpParticipant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile</span>
                <span className="font-semibold text-slate-800">{otpParticipant.mobile_number || otpParticipant.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">OTP Status</span>
                {otpParticipant.otp_verified ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> Already Verified
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    Pending Verification
                  </Badge>
                )}
              </div>

            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Enter OTP to Verify</label>
              <Input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest h-14 border-green-300 focus:border-green-500 focus:ring-green-500/20"
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowOtpModal(false); setOtpInput("") }}
                className="flex-1 border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyOtp}
                disabled={isVerifyingOtp || !otpInput.trim() || otpParticipant.otp_verified}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isVerifyingOtp ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Verify OTP</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
      <DialogContent className="max-w-md bg-card text-card-foreground">
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
              <p className="text-sm text-slate-900">
                <span className="font-semibold">Participant:</span> {participants.find(p => p.id === deletingParticipantId)?.name || "Unknown"}
              </p>
              <p className="text-sm text-slate-900">
                <span className="font-semibold">Email:</span> {participants.find(p => p.id === deletingParticipantId)?.email}
              </p>
              <p className="text-sm text-red-600 font-semibold">
                All related data will be deleted including:
              </p>
              <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
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
                className="flex-1 border-slate-300 text-slate-800 hover:bg-slate-100"
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
