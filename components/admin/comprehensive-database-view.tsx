"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Database,
  Search,
  Edit,
  Wallet,
  User,
  Hash,
  DollarSign,
  CheckCircle2,
  Save,
  X,
  Copy,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserDatabaseRecord {
  id: string
  serial_number: string
  username: string
  full_name: string
  email: string
  wallet_address: string | null
  contribution_address: string | null // The address admin assigns for user to contribute
  wallet_balance: number
  is_active: boolean
  created_at: string
  payout_serial?: string
  payout_amount?: number
  payout_status?: string
}

export function ComprehensiveDatabaseView() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserDatabaseRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserDatabaseRecord | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingContributionAddress, setEditingContributionAddress] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      if (!isMounted) return
      await fetchUserData()
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      const [participantsRes, poolRes, payoutsRes] = await Promise.all([
        fetch("/api/admin/participants-list"),
        fetch("/api/admin/wallet-pool"),
        fetch("/api/admin/payout-requests"),
      ])
      const [participantsData, poolData, payoutsData] = await Promise.all([
        participantsRes.json(),
        poolRes.json(),
        payoutsRes.json(),
      ])

      const participants = participantsData.participants || []
      const walletPool = poolData.pool || []
      const payouts = payoutsData.payouts || []

      const combinedData: UserDatabaseRecord[] = participants.map((participant: any) => {
        const poolEntry = walletPool.find((w: any) => w.assigned_to === participant.email)
        const latestPayout = payouts.find((p: any) => p.participant_email === participant.email)
        return {
          ...participant,
          wallet_balance: participant.account_balance || 0,
          contribution_address: poolEntry?.wallet_address || null,
          payout_serial: latestPayout?.serial_number,
          payout_amount: latestPayout?.amount,
          payout_status: latestPayout?.status,
        }
      })

      setUsers(combinedData)
    } catch (error: any) {
      if (error?.name === "AbortError") return
      console.error("Error loading database:", error)
      toast({ title: "Error", description: error?.message || "Failed to load user database", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditContributionAddress = (user: UserDatabaseRecord) => {
    setSelectedUser(user)
    setEditingContributionAddress(user.contribution_address || "")
    setShowEditDialog(true)
  }

  const handleSaveContributionAddress = async () => {
    if (!selectedUser) return
    try {
      setIsSaving(true)
      const res = await fetch("/api/admin/wallet-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUser.email, wallet_address: editingContributionAddress }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: "Success", description: `Contribution address updated for ${selectedUser.username}` })
      setShowEditDialog(false)
      fetchUserData()
    } catch (error) {
      console.error("Error saving contribution address:", error)
      toast({ title: "Error", description: "Failed to update contribution address", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const filteredUsers = users.filter((user) => {
    const search = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.serial_number?.toLowerCase().includes(search) ||
      user.payout_serial?.toLowerCase().includes(search) ||
      user.wallet_address?.toLowerCase().includes(search) ||
      user.contribution_address?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="relative">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-orange-300 to-rose-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-300 to-violet-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <Card className="relative bg-gradient-to-br from-white/95 via-orange-50/30 to-rose-50/30 backdrop-blur-sm border-orange-200/50 shadow-xl">
        <CardHeader className="border-b border-orange-200/30 pb-4 bg-gradient-to-r from-orange-50/50 to-rose-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
                <Database className="h-6 w-6 text-orange-500" />
                Comprehensive User Database
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                View and manage user details, wallet addresses, and payout information
              </CardDescription>
            </div>
            <Button
              onClick={fetchUserData}
              variant="outline"
              className="border-orange-300 hover:bg-orange-50 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
              <Input
                placeholder="Search by name, email, serial #, wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gradient-to-r from-orange-50/50 to-rose-50/50 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
              />
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gradient-to-br from-orange-100 to-rose-100 rounded-lg p-3 border border-orange-200 shadow-sm">
              <p className="text-xs text-orange-700 font-semibold">Total Users</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
                {users.length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-lg p-3 border border-emerald-200 shadow-sm">
              <p className="text-xs text-emerald-700 font-semibold">With Payouts</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                {users.filter((u) => u.payout_serial).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg p-3 border border-purple-200 shadow-sm">
              <p className="text-xs text-purple-700 font-semibold">Activated</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                {users.filter((u) => u.is_active).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg p-3 border border-cyan-200 shadow-sm">
              <p className="text-xs text-cyan-700 font-semibold">Filtered Results</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {filteredUsers.length}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              <span className="ml-3 text-slate-600">Loading database...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-orange-200/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-100/50 via-rose-100/50 to-purple-100/50 border-b-2 border-orange-200">
                    <TableHead className="font-semibold text-orange-600">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        User #
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-purple-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        User Info
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-cyan-600">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Payout Wallet
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-emerald-600">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Contribution Address
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-violet-600">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Payout Info
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold text-rose-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b border-orange-100/50 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-rose-50/50 transition-all duration-200"
                    >
                      {/* User Number */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono font-bold">
                            {user.serial_number}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{user.full_name}</p>
                          <p className="text-sm text-slate-600">@{user.username}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.wallet_address ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-cyan-50 px-2 py-1 rounded border border-cyan-200 font-mono">
                                {user.wallet_address.slice(0, 10)}...
                                {user.wallet_address.slice(-8)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    user.wallet_address || "",
                                    "Payout address"
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Balance: ${user.wallet_balance.toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.contribution_address ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-mono">
                              {user.contribution_address.slice(0, 10)}...{user.contribution_address.slice(-8)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(user.contribution_address!, "Contribution address")}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Not assigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.payout_serial ? (
                          <div className="space-y-1">
                            <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white font-mono">
                              {user.payout_serial}
                            </Badge>
                            <p className="text-sm font-semibold text-emerald-600">
                              ${user.payout_amount?.toFixed(2)}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                user.payout_status === "completed"
                                  ? "border-green-300 text-green-700"
                                  : user.payout_status === "pending"
                                    ? "border-amber-300 text-amber-700"
                                    : "border-slate-300 text-slate-700"
                              }
                            >
                              {user.payout_status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No payout</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditContributionAddress(user)}
                          className="border-orange-300 hover:bg-orange-50"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Address
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contribution Address Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gradient-to-br from-white via-orange-50/30 to-rose-50/30">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
              Edit Contribution Address
            </DialogTitle>
            <DialogDescription>
              Set the wallet address where {selectedUser?.full_name || selectedUser?.username} should send contributions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-700 font-semibold mb-2 block">User Information</Label>
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm">
                  <span className="font-semibold">Name:</span> {selectedUser?.full_name || selectedUser?.username}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Username:</span> @{selectedUser?.username}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Email:</span> {selectedUser?.email}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="contribution-address" className="text-slate-700 font-semibold mb-2 block">
                Contribution Address (BEP20)
              </Label>
              <Input
                id="contribution-address"
                placeholder="0x..."
                value={editingContributionAddress}
                onChange={(e) => setEditingContributionAddress(e.target.value)}
                className="font-mono bg-gradient-to-r from-white to-emerald-50/30 border-emerald-200 focus:border-emerald-400"
              />
              <p className="text-xs text-slate-500 mt-1">
                This address will be shown to the user for making contributions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSaving}
              className="border-slate-300"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveContributionAddress}
              disabled={isSaving || !editingContributionAddress.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Address
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
