"use client"

import { useEffect, useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AlertCircle, Bot, CheckCircle2, Clock3, Headphones, Loader2, LogOut, MessageSquare, RefreshCw, Send, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { clearAdminAuth, adminFetch, getAdminData } from "@/lib/auth"
import type { SupportTicket } from "@/lib/types"

const statusStyles: Record<SupportTicket["status"], string> = {
  open: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  in_progress: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  closed: "border-slate-400/20 bg-slate-400/10 text-slate-300",
}

export function CustomerCareWorkspace({ onLogout }: { onLogout: () => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [reply, setReply] = useState("")
  const [status, setStatus] = useState<SupportTicket["status"]>("in_progress")
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const admin = getAdminData()
  const { messages, sendMessage, status: chatStatus } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, messages } }),
    }),
  })

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const response = await adminFetch("/api/support/tickets")
      const data = await response.json()
      if (data.success) setTickets(data.tickets)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    const interval = setInterval(loadTickets, 15000)
    return () => clearInterval(interval)
  }, [])

  const filteredTickets = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tickets
    return tickets.filter((ticket) => [ticket.id, ticket.subject, ticket.message, ticket.participantEmail].some((value) => value.toLowerCase().includes(needle)))
  }, [query, tickets])

  const selectTicket = (ticket: SupportTicket) => {
    setSelected(ticket)
    setReply(ticket.admin_response || "")
    setStatus(ticket.status === "open" ? "in_progress" : ticket.status)
  }

  const saveReply = async () => {
    if (!selected || !reply.trim()) return
    setIsSaving(true)
    try {
      const response = await adminFetch("/api/support/tickets", {
        method: "PATCH",
        body: JSON.stringify({ ticketId: selected.id, status, admin_response: reply }),
      })
      const data = await response.json()
      if (data.success) {
        setTickets((current) => current.map((ticket) => ticket.id === selected.id ? data.ticket : ticket))
        setSelected(data.ticket)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const submitChat = (event: React.FormEvent) => {
    event.preventDefault()
    if (!query.trim() || chatStatus !== "ready") return
    sendMessage({ text: query })
    setQuery("")
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <header className="flex items-center justify-between border-b border-cyan-300/10 bg-[#0b1b2d] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10"><Headphones className="size-5 text-cyan-300" /></div>
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Customer Care</p><p className="text-xs text-slate-400">Participant support command center</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-400 sm:block">{admin?.email}</span><Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-300 hover:bg-white/5 hover:text-white"><LogOut className="mr-2 size-4" />Sign out</Button></div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[minmax(300px,1fr)_minmax(340px,1.3fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#0b1b2d]">
          <div className="flex items-center justify-between border-b border-white/5 p-4"><div><h1 className="font-semibold">Ticket queue</h1><p className="text-xs text-slate-500">Every request from the participant dashboard</p></div><Button variant="ghost" size="icon" onClick={loadTickets} aria-label="Refresh tickets"><RefreshCw className="size-4 text-cyan-300" /></Button></div>
          <div className="border-b border-white/5 p-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets" className="border-white/10 bg-[#07111f] text-sm" /></div>
          <div className="max-h-[calc(100vh-190px)] overflow-y-auto p-2">
            {isLoading ? <div className="flex items-center justify-center p-8 text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Loading tickets</div> : filteredTickets.length === 0 ? <div className="p-8 text-center text-sm text-slate-500"><MessageSquare className="mx-auto mb-2 size-8 opacity-50" />No participant tickets yet.</div> : filteredTickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => selectTicket(ticket)} className={`w-full rounded-xl p-3 text-left transition-colors ${selected?.id === ticket.id ? "bg-cyan-300/10 ring-1 ring-cyan-300/30" : "hover:bg-white/[.03]"}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-200">{ticket.subject}</span><Badge className={`shrink-0 border text-[10px] ${statusStyles[ticket.status]}`}>{ticket.status.replace("_", " ")}</Badge></div><p className="mt-1 truncate text-xs text-slate-400">{ticket.participantEmail}</p><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{ticket.message}</p><p className="mt-2 text-[10px] text-slate-600">{new Date(ticket.created_at).toLocaleString()}</p></button>)}
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-300/10 bg-[#0b1b2d] p-5">
          {selected ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-cyan-300">{selected.id}</p><h2 className="mt-2 text-xl font-semibold text-white">{selected.subject}</h2><p className="mt-1 text-sm text-slate-400">{selected.participantName} · {selected.participantEmail}</p></div><Badge className={`border ${statusStyles[selected.status]}`}>{selected.priority} priority</Badge></div><div className="mt-6 rounded-xl border border-white/5 bg-[#07111f] p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Participant query</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{selected.message}</p></div><div className="mt-5 grid gap-2"><label htmlFor="care-status" className="text-xs font-semibold text-slate-400">Status</label><select id="care-status" value={status} onChange={(event) => setStatus(event.target.value as SupportTicket["status"])} className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-sm text-slate-200"><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><label htmlFor="care-reply" className="mt-2 text-xs font-semibold text-slate-400">Reply to participant</label><Textarea id="care-reply" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear response..." className="min-h-36 resize-none border-white/10 bg-[#07111f] text-sm" /><Button onClick={saveReply} disabled={isSaving || !reply.trim()} className="bg-cyan-600 text-white hover:bg-cyan-500"><Send className="mr-2 size-4" />{isSaving ? "Saving..." : "Send response"}</Button></div></> : <div className="flex h-full min-h-[500px] flex-col items-center justify-center text-center"><UserRound className="mb-4 size-10 text-cyan-300/50" /><h2 className="font-semibold text-white">Select a participant ticket</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Review the query, respond, and update its status from one workspace.</p></div>}
        </section>

        <section className="flex min-h-[500px] flex-col rounded-2xl border border-cyan-300/10 bg-[#0b1b2d]">
          <div className="border-b border-white/5 p-4"><div className="flex items-center gap-2"><Bot className="size-4 text-cyan-300" /><h2 className="font-semibold">Live support bot</h2></div><p className="mt-1 text-xs text-slate-500">Ask about platform policy, participant issues, or next steps.</p></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 ? <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-sm leading-6 text-slate-400">The support bot is ready. Use it to draft a response or clarify a participant question.</div> : messages.map((message) => <div key={message.id} className={`rounded-xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-6 bg-cyan-300/10 text-cyan-50" : "mr-6 bg-[#07111f] text-slate-300"}`}>{message.parts?.filter((part) => part.type === "text").map((part) => part.type === "text" ? part.text : "").join("")}</div>)}</div>
          <form onSubmit={submitChat} className="flex gap-2 border-t border-white/5 p-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask the support bot..." className="border-white/10 bg-[#07111f] text-sm" /><Button type="submit" size="icon" disabled={chatStatus !== "ready" || !query.trim()} className="bg-cyan-600 hover:bg-cyan-500" aria-label="Send chat message"><Send className="size-4" /></Button></form>
        </section>
      </div>
    </main>
  )
}

export function logoutCustomerCare() {
  clearAdminAuth()
}

export const ticketStatusIcon = (status: SupportTicket["status"]) => status === "open" ? AlertCircle : status === "in_progress" ? Clock3 : CheckCircle2
