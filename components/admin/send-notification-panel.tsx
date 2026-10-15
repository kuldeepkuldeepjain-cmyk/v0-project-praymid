"use client"

import { useEffect, useMemo, useState } from "react"
import { Mail, Send, Users, UserRound, UsersRound, Loader2, Search, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { adminFetch } from "@/lib/auth"

type RecipientMode = "single" | "multiple" | "all"
type Recipient = { id: string; name: string; email: string }

export function SendNotificationPanel() {
  const { toast } = useToast()
  const [mode, setMode] = useState<RecipientMode>("single")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (mode === "all" || recipients.length) return
    setLoadingRecipients(true)
    adminFetch("/api/admin/email-recipients")
      .then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Unable to load recipients"); setRecipients(data.recipients || []) })
      .catch(error => toast({ title: "Unable to load users", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }))
      .finally(() => setLoadingRecipients(false))
  }, [mode, recipients.length, toast])

  const filteredRecipients = useMemo(() => { const term = recipientSearch.trim().toLowerCase(); return recipients.filter(recipient => !term || `${recipient.name} ${recipient.email}`.toLowerCase().includes(term)) }, [recipientSearch, recipients])
  const selectedRecipientEmails = mode === "single" ? selectedEmails.slice(0, 1) : selectedEmails

  const sendEmail = async () => {
    const parsedEmails = selectedRecipientEmails
    if (!subject.trim() || !message.trim() || (mode === "single" && !selectedRecipientEmails.length) || (mode === "multiple" && !selectedRecipientEmails.length)) {
      toast({ title: "Complete all fields", description: "Choose recipients and provide a subject and message.", variant: "destructive" })
      return
    }
    if (!window.confirm(`Send this email to ${mode === "all" ? "all participants" : mode === "single" ? selectedRecipientEmails[0] : `${selectedRecipientEmails.length} recipients`}?`)) return
    setSending(true)
    try {
      const response = await adminFetch("/api/admin/send-email", { method: "POST", body: JSON.stringify({ mode, email: selectedRecipientEmails[0] || "", emails: parsedEmails, subject, message }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Email could not be sent")
      toast({ title: "Email sent", description: `${data.count} recipient${data.count === 1 ? "" : "s"} accepted by Resend.` })
      setSubject(""); setMessage(""); setSelectedEmails([])
    } catch (error) {
      toast({ title: "Email failed", description: error instanceof Error ? error.message : "Unable to send email.", variant: "destructive" })
    } finally { setSending(false) }
  }

  const options = [
    { value: "single" as const, label: "Single user", icon: UserRound },
    { value: "multiple" as const, label: "Multiple users", icon: UsersRound },
    { value: "all" as const, label: "All participants", icon: Users },
  ]

  return (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300"><Mail className="size-5" /></div>
        <div><h2 className="text-2xl font-semibold text-white">Send custom email</h2><p className="mt-1 text-sm leading-6 text-slate-400">Send a custom Resend email to one user, selected users, or all participants.</p></div>
      </div>
      <Card className="border-cyan-400/20 bg-slate-900/70">
        <CardHeader><CardTitle className="text-white">Compose email</CardTitle><CardDescription className="text-slate-400">Messages are sent server-side from verify@elitefund.sbs. Maximum 100 recipients per send.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">{options.map(option => { const Icon = option.icon; return <button key={option.value} type="button" onClick={() => setMode(option.value)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${mode === option.value ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500"}`}><Icon className="size-4" /><span className="text-sm font-medium">{option.label}</span></button> })}</div>
          {(mode === "single" || mode === "multiple") && <div className="space-y-3"><div className="flex items-center justify-between"><Label className="text-slate-200">Select {mode === "single" ? "a user" : "users"}</Label>{mode === "multiple" && <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedEmails(selectedEmails.length === filteredRecipients.length ? [] : filteredRecipients.map(recipient => recipient.email))}>{selectedEmails.length === filteredRecipients.length ? "Clear all" : "Select all"}</Button>}</div><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-500" /><Input value={recipientSearch} onChange={event => setRecipientSearch(event.target.value)} placeholder="Search by name or email" className="pl-9" /></div><div className="max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/50 p-2">{loadingRecipients ? <p className="p-3 text-sm text-slate-400">Loading users...</p> : filteredRecipients.length ? filteredRecipients.map(recipient => { const selected = selectedEmails.includes(recipient.email); return <button key={recipient.id} type="button" onClick={() => setSelectedEmails(mode === "single" ? [recipient.email] : selected ? selectedEmails.filter(value => value !== recipient.email) : [...selectedEmails, recipient.email])} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition ${selected ? "bg-cyan-400/10 text-cyan-200" : "text-slate-300 hover:bg-slate-800"}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{recipient.name}</span><span className="block truncate text-xs text-slate-500">{recipient.email}</span></span>{selected && <Check className="size-4 shrink-0 text-cyan-300" />}</button> }) : <p className="p-3 text-sm text-slate-400">No users found.</p>}</div><p className="text-xs text-slate-500">{selectedEmails.length} user{selectedEmails.length === 1 ? "" : "s"} selected. No email pasting required.</p></div>}
          <div className="space-y-2"><Label className="text-slate-200">Subject</Label><Input maxLength={180} value={subject} onChange={event => setSubject(event.target.value)} placeholder="Email subject" /></div>
          <div className="space-y-2"><Label className="text-slate-200">Message</Label><Textarea maxLength={10000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Write your message..." className="min-h-48" /></div>
          <Button type="button" onClick={sendEmail} disabled={sending} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">{sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}{sending ? "Sending..." : "Send custom email"}</Button>
        </CardContent>
      </Card>
    </section>
  )
}
