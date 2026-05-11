"use client"

import { adminFetch } from "@/lib/auth"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Loader2, CheckCircle2, Trash2, Search, RefreshCw, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Participant {
  id: string
  full_name: string
  email: string
  mobile_number?: string
  account_balance: number
  status: string
  created_at: string
}

export function DeleteParticipantsPanel() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Participant | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  const fetchParticipants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch("/api/admin/participants")
      const data = await res.json()
      setParticipants(data.participants || data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load participants", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchParticipants() }, [fetchParticipants])

  const handleDelete = async (participant: Participant) => {
    setDeletingId(participant.id)
    setConfirmDelete(null)
    try {
      const res = await adminFetch("/api/admin/delete-participant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Delete Failed", description: "Unable to delete participant. Please try again.", variant: "destructive" })
        return
      }
      setParticipants(prev => prev.filter(p => p.id !== participant.id))
      toast({ title: "Deleted", description: `${participant.email} permanently removed from all systems.` })
    } catch {
      toast({ title: "Delete Failed", description: "Unable to delete participant. Please try again.", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    setConfirmDeleteAll(false)
    setIsDeletingAll(true)
    try {
      const res = await adminFetch("/api/admin/delete-all-participants-except", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Delete Failed", description: "Unable to delete participants. Please try again.", variant: "destructive" })
        return
      }
      setParticipants([])
      toast({ title: "All Deleted", description: `${data.deletedParticipants || 0} participants permanently removed.` })
    } catch {
      toast({ title: "Delete Failed", description: "Unable to delete participants. Please try again.", variant: "destructive" })
    } finally {
      setIsDeletingAll(false)
    }
  }

  const filtered = participants.filter(p =>
    !search ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile_number?.includes(search)
  )

  return (
    <>
      <Card className="bg-slate-900 border-slate-700/60">
        <CardHeader className="border-b border-slate-700/60 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4" />
                Delete Participants
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Permanently removes participant and ALL related data from the database — transactions, predictions, payouts, contributions, etc.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                onClick={fetchParticipants}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setConfirmDeleteAll(true)}
                disabled={isDeletingAll || participants.length === 0}
              >
                {isDeletingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                Delete All ({participants.length})
              </Button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search by name, email or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Users className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">No participants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/50 hover:bg-slate-800/50 border-b border-slate-700/60">
                    <TableHead className="text-xs text-slate-400 py-2.5 pl-5">Name / Email</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2.5">Mobile</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2.5">Balance</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2.5">Status</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2.5">Joined</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2.5 pr-5 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="py-2.5 pl-5">
                        <div className="text-xs font-medium text-slate-200">{p.full_name || "—"}</div>
                        <div className="text-xs text-slate-500">{p.email}</div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-400">
                        {p.mobile_number || "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-medium text-emerald-400">
                        ${Number(p.account_balance || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0 ${
                            p.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-700 text-slate-400 border-slate-600"
                          }`}
                        >
                          {p.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-500">
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="py-2.5 pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                          onClick={() => setConfirmDelete(p)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</>
                          }
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

      {/* Single delete confirmation dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Permanently Delete Participant?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete <span className="text-white font-medium">{confirmDelete?.email}</span> and
              ALL their data — transactions, predictions, payouts, contributions, topups, and more.
              <span className="block mt-2 text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirmation dialog */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete ALL {participants.length} Participants?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete every participant and all their data from the entire system.
              <span className="block mt-2 text-red-400 font-medium">This cannot be undone. Are you absolutely sure?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteAll}
            >
              Delete All Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
