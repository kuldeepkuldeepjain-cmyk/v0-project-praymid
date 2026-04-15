"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Eye, CheckCircle2, XCircle, Clock, ImageIcon, Wallet, Mail, Calendar, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { PaymentSubmission } from "@/app/api/participant/submit-payment/route"

type Props = {
  submissions: PaymentSubmission[]
  onStatusUpdate: (submissionId: string, status: "confirmed" | "rejected", reason?: string) => Promise<void>
}

export function PaymentSubmissionsTable({ submissions, onStatusUpdate }: Props) {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all")
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.participantEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.participantWallet.toLowerCase().includes(search.toLowerCase()) ||
      s.participantName?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleConfirm = async (submission: PaymentSubmission) => {
    setIsUpdating(true)
    try {
      await onStatusUpdate(submission.id, "confirmed")
      toast({
        title: "Payment Confirmed",
        description: `Payment from ${submission.participantEmail} has been confirmed`,
      })
      setSelectedSubmission(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission) return
    setIsUpdating(true)
    try {
      await onStatusUpdate(selectedSubmission.id, "rejected", rejectionReason)
      toast({
        title: "Payment Rejected",
        description: `Payment from ${selectedSubmission.participantEmail} has been rejected`,
      })
      setShowRejectDialog(false)
      setSelectedSubmission(null)
      setRejectionReason("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject payment",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: PaymentSubmission["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-0 shadow-sm">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "confirmed":
        return (
          <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-0 shadow-sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-0 shadow-sm">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
    }
  }

  return (
    <Card className="glass rounded-2xl mt-6 border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#E85D3B]/5 to-[#f97316]/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center shadow-md">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              Payment Submissions
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Review and verify payment screenshots from participants
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md animate-pulse">
              {submissions.filter((s) => s.status === "pending").length} pending
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by email, wallet, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/80 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#E85D3B] focus:ring-[#E85D3B]/20 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "confirmed", "rejected"] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "btn-glow bg-gradient-to-r from-[#E85D3B] to-[#f97316] text-white border-0 shadow-md rounded-xl"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl"
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 hover:bg-gray-100/80">
                <TableHead className="font-bold text-gray-900">Participant</TableHead>
                <TableHead className="font-bold text-gray-900">Amount</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Date</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No submissions found</p>
                      <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission, index) => (
                  <TableRow
                    key={submission.id}
                    className="group hover:bg-[#E85D3B]/5 transition-all duration-300 animate-slide-up-fade"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-gray-900 group-hover:text-[#E85D3B] transition-colors">
                          {submission.participant_name || "Unknown"}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          {submission.participantEmail}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                          <Wallet className="h-3 w-3" />
                          {submission.participantWallet.slice(0, 8)}...{submission.participantWallet.slice(-6)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#E85D3B]" />
                        <span className="font-bold text-gray-900">${submission.amount}</span>
                        <span className="text-xs text-gray-500">USDT</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(submission.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg transition-all duration-300"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {submission.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirm(submission)}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-300"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSubmission(submission)
                                setShowRejectDialog(true)
                              }}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission && !showRejectDialog} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="glass border-0 shadow-2xl rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-white" />
              </div>
              Payment Details
            </DialogTitle>
            <DialogDescription className="text-gray-500">Review the payment submission details below</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <Label className="text-xs text-gray-500">Participant</Label>
                  <p className="font-semibold text-gray-900">{selectedSubmission.participant_name}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <Label className="text-xs text-gray-500">Amount</Label>
                  <p className="font-bold text-[#E85D3B]">${selectedSubmission.amount} USDT</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 col-span-2">
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium text-gray-900">{selectedSubmission.participantEmail}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 col-span-2">
                  <Label className="text-xs text-gray-500">Transaction Hash</Label>
                  <p className="font-mono text-xs text-gray-700 break-all">
                    {selectedSubmission.transactionHash || "Not provided"}
                  </p>
                </div>
              </div>
              {(selectedSubmission.screenshot_url || selectedSubmission.screenshotData) && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Payment Screenshot</Label>
                  <div 
                    className="rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-[#E85D3B] transition-all duration-300 group"
                    onClick={() => setLightboxImage(selectedSubmission.screenshot_url || selectedSubmission.screenshotData)}
                  >
                    <img
                      src={selectedSubmission.screenshot_url || selectedSubmission.screenshotData || "/placeholder.svg"}
                      alt="Payment Screenshot"
                      className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" />
                    Click to view in full screen
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSubmission(null)} className="rounded-xl">
              Close
            </Button>
            {selectedSubmission?.status === "pending" && (
              <>
                <Button
                  onClick={() => handleConfirm(selectedSubmission)}
                  disabled={isUpdating}
                  className="btn-glow bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isUpdating}
                  className="rounded-xl"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="Payment Screenshot Full View"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              onClick={() => setLightboxImage(null)}
            >
              <XCircle className="h-6 w-6" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Reject Payment</DialogTitle>
            <DialogDescription className="text-gray-500">
              Please provide a reason for rejecting this payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700">Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="mt-2 bg-white border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason("")
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isUpdating || !rejectionReason}
              className="rounded-xl"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
