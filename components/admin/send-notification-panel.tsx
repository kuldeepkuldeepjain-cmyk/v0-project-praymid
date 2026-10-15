"use client"

import { useState } from "react"
import { Mail, Send, Users, UserRound, UsersRound, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { adminFetch } from "@/lib/auth"

type RecipientMode = "single" | "multiple" | "all"

export function SendNotificationPanel() {
  const { toast } = useToast()
  const [mode, setMode] = useState<RecipientMode>("single")
  const [email, setEmail] = useState("")
  const [emails, setEmails] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const sendEmail = async () => {
    const parsedEmails = emails.split(/[\s,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean)
    if (!subject.trim() || !message.trim() || (mode === "single" && !email.trim()) || (mode === "multiple" && !parsedEmails.length)) {
      toast({ title: "Complete all fields", description: "Choose recipients and provide a subject and message.", variant: "destructive" })
      return
    }
    if (!window.confirm(`Send this email to ${mode === "all" ? "all participants" : mode === "single" ? email : `${parsedEmails.length} recipients`}?`)) return
    setSending(true)
    try {
      const response = await adminFetch("/api/admin/send-email", { method: "POST", body: JSON.stringify({ mode, email, emails: parsedEmails, subject, message }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Email could not be sent")
      toast({ title: "Email sent", description: `${data.count} recipient${data.count === 1 ? "" : "s"} accepted by Resend.` })
      setSubject(""); setMessage(""); setEmail(""); setEmails("")
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
          {mode === "single" && <div className="space-y-2"><Label className="text-slate-200">Recipient email</Label><Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="user@example.com" /></div>}
          {mode === "multiple" && <div className="space-y-2"><Label className="text-slate-200">Recipient emails</Label><Textarea value={emails} onChange={event => setEmails(event.target.value)} placeholder="Paste emails separated by commas, spaces, or new lines" className="min-h-24" /></div>}
          <div className="space-y-2"><Label className="text-slate-200">Subject</Label><Input maxLength={180} value={subject} onChange={event => setSubject(event.target.value)} placeholder="Email subject" /></div>
          <div className="space-y-2"><Label className="text-slate-200">Message</Label><Textarea maxLength={10000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Write your message..." className="min-h-48" /></div>
          <Button type="button" onClick={sendEmail} disabled={sending} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">{sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}{sending ? "Sending..." : "Send custom email"}</Button>
        </CardContent>
      </Card>
    </section>
  )
}
