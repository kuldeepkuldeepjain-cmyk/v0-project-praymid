"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare, Mail, Loader2, CheckCircle, Clock, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

interface SupportTicket {
  id: string
  subject: string
  message: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: string
  created_at: string
  admin_response?: string
}

const STATUS_STYLES: Record<SupportTicket["status"], string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-sky-100 text-sky-700 border-sky-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
}

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
}

export default function HelpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  })

  const isAuthenticated = isParticipantAuthenticated()

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/support/tickets", { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      if (data.success) setTickets(data.tickets || [])
    } catch (error) {
      console.error("[v0] Failed to load support tickets:", error)
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }
    fetchTickets()
    const interval = setInterval(fetchTickets, 20000)
    return () => clearInterval(interval)
  }, [router, isAuthenticated, fetchTickets])

  const handleSubmitSupport = async () => {
    if (!supportForm.subject || !supportForm.message) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: supportForm.subject, message: supportForm.message }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request")
      }
      setSubmitted(true)
      toast({ title: "Submitted", description: "Your support request has been sent" })
      setSupportForm({ subject: "", message: "" })
      fetchTickets()
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link href="/participant/dashboard/profile">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Help & Support</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Contact Support */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Contact Support</h3>
                <p className="text-sm text-slate-500">Can&apos;t find what you&apos;re looking for?</p>
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Contact us by email</p>
              <div className="mt-2 flex flex-col gap-1">
                <a href="mailto:support@elitefund.sbs" className="text-cyan-700 hover:underline">support@elitefund.sbs</a>
                <a href="mailto:care@elitefunds.sbs" className="text-cyan-700 hover:underline">care@elitefunds.sbs</a>
              </div>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Request Submitted!</h4>
                <p className="text-sm text-slate-500">We&apos;ll get back to you within 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="What do you need help with?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSubmitSupport} disabled={isSubmitting} className="w-full bg-[#7c3aed]">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket / message history, including admin-sent messages */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Your Messages</h3>
                <p className="text-sm text-slate-500">Replies from support and admin appear here</p>
              </div>
            </div>

            {loadingTickets ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                No messages yet. Submit a request above to start a conversation.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900 text-sm leading-snug text-pretty">{ticket.subject}</p>
                      <Badge variant="outline" className={`shrink-0 text-xs ${STATUS_STYLES[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{ticket.message}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleString()}
                    </div>
                    {ticket.admin_response && (
                      <div className="mt-2 rounded-md bg-cyan-50 border border-cyan-100 p-3">
                        <p className="text-xs font-semibold text-cyan-700 mb-1">Support Team</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{ticket.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
