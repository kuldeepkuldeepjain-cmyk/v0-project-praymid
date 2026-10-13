"use client"

import { useState, type FormEvent } from "react"
import { LockKeyhole, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function ParticipantPinSetup({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast()
  const [pin, setPin] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(pin) || pin !== confirmation) return
    setLoading(true)
    try {
      const response = await fetch("/api/participant/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin, confirmation }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save PIN")
      toast({ title: "PIN created", description: "Your participant PIN is now protected." })
      onComplete()
    } catch (error) {
      toast({ title: "PIN setup failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const invalid = pin.length > 0 && !/^\d{4,6}$/.test(pin)
  const mismatch = confirmation.length > 0 && pin !== confirmation

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#0b1829] p-6 text-slate-100 shadow-2xl sm:p-8">
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <LockKeyhole className="size-6" />
        </div>
        <div className="mb-6 space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"><ShieldCheck className="size-4" /> Account security</p>
          <h2 className="text-2xl font-bold text-white">Create your login PIN</h2>
          <p className="text-sm leading-6 text-slate-400">Your password has been accepted. Create a 4 to 6 digit PIN for faster, secure access to the participant dashboard.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium text-slate-300">New PIN<Input inputMode="numeric" type="password" maxLength={6} autoFocus value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="4–6 digits" aria-invalid={invalid} /></label>
          <label className="block space-y-2 text-sm font-medium text-slate-300">Confirm PIN<Input inputMode="numeric" type="password" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ""))} placeholder="Repeat your PIN" aria-invalid={mismatch} /></label>
          <p className="min-h-5 text-xs text-rose-300">{invalid ? "Use 4 to 6 digits." : mismatch ? "PINs do not match." : ""}</p>
          <Button type="submit" disabled={loading || !/^\d{4,6}$/.test(pin) || pin !== confirmation} className="h-11 w-full bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400">{loading ? "Saving PIN…" : "Create PIN"}</Button>
        </form>
      </div>
    </div>
  )
}
