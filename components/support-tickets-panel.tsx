"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react"
import type { SupportTicket } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function SupportTicketsPanel() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [adminResponse, setAdminResponse] = useState("")
  const [isResponding, setIsResponding] = useState(false)

  useEffect(() => {
    fetchTickets()
    const interval = setInterval(fetchTickets, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/support/tickets")
      const data = await response.json()
      if (data.success) {
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error)
    }
  }

  const handleRespond = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setAdminResponse("")
    setShowResponseDialog(true)
  }

  const handleSubmitResponse = async () => {
    if (!selectedTicket || !adminResponse.trim()) return

    setIsResponding(true)
    try {
      const response = await fetch("/api/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status: "resolved",
          admin_response: adminResponse,
          admin_id: "admin",
        }),
      })

      if (!response.ok) throw new Error("Failed to update ticket")

      toast({
        title: "Response Sent",
        description: "Ticket has been marked as resolved",
      })

      setShowResponseDialog(false)
      setSelectedTicket(null)
      setAdminResponse("")
      fetchTickets()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive",
      })
    } finally {
      setIsResponding(false)
    }
  }

  const getStatusIcon = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />
      case "in_progress":
        return <Clock className="h-4 w-4" />
      case "resolved":
      case "closed":
        return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700"
      case "in_progress":
        return "bg-amber-100 text-amber-700"
      case "resolved":
      case "closed":
        return "bg-emerald-100 text-emerald-700"
    }
  }

  const getPriorityColor = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700"
      case "medium":
        return "bg-amber-100 text-amber-700"
      case "low":
        return "bg-slate-100 text-slate-700"
    }
  }

  const openTickets = tickets.filter((t) => t.status === "open").length

  return (
    <>
      <Card className="card-elevated">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-violet-600" />
                Support Tickets
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">Manage participant support requests</CardDescription>
            </div>
            {openTickets > 0 && <Badge className="bg-red-100 text-red-700 border-0">{openTickets} Open</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No support tickets yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getPriorityColor(ticket.priority)} border-0 text-xs`}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                        <Badge className={`${getStatusColor(ticket.status)} border-0 text-xs`}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">{ticket.status.replace("_", " ").toUpperCase()}</span>
                        </Badge>
                        <span className="text-xs text-slate-400">#{ticket.id}</span>
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">{ticket.subject}</h4>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{ticket.participantEmail}</span>
                        <span>•</span>
                        <span>{ticket.category}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {ticket.status === "open" && (
                      <Button
                        size="sm"
                        onClick={() => handleRespond(ticket)}
                        className="btn-primary-light flex-shrink-0"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Respond to Ticket</DialogTitle>
            <DialogDescription className="text-slate-500">{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 font-medium mb-1">Original Message:</p>
              <p className="text-sm text-slate-700">{selectedTicket?.message}</p>
            </div>
            <div>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Type your response here..."
                className="input-field-light min-h-[150px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)} className="border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={isResponding || !adminResponse.trim()}
              className="btn-primary-light"
            >
              <Send className="h-4 w-4 mr-2" />
              {isResponding ? "Sending..." : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
