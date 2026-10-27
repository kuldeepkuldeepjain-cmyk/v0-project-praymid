"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminFetch } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Plus, TicketPercent, Power, Loader2 } from "lucide-react"

type PromoCode = { id: string; code: string; discount_percent: number; active: boolean; expires_at: string | null; max_uses: number | null; used_count: number; created_at: string }

export function PromoCodesPanel() {
  const { toast } = useToast()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("5")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCodes = async () => {
    try {
      const response = await adminFetch("/api/admin/promo-codes")
      const data = await response.json()
      if (data.success) setCodes(data.promoCodes || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadCodes() }, [])

  const createCode = async () => {
    setSaving(true)
    try {
      const response = await adminFetch("/api/admin/promo-codes", { method: "POST", body: JSON.stringify({ code, discountPercent: discount, maxUses, expiresAt }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to create promo code")
      toast({ title: "Promo code created", description: `${code.toUpperCase()} is ready for participants.` })
      setCode(""); setDiscount("5"); setMaxUses(""); setExpiresAt(""); await loadCodes()
    } catch (error) { toast({ title: "Could not create code", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const toggleCode = async (item: PromoCode) => {
    const response = await adminFetch("/api/admin/promo-codes", { method: "PATCH", body: JSON.stringify({ id: item.id, active: !item.active }) })
    const data = await response.json()
    if (data.success) setCodes((current) => current.map((codeItem) => codeItem.id === item.id ? { ...codeItem, active: !item.active } : codeItem))
  }

  return <Card className="border-violet-700/50 bg-slate-800">
    <CardHeader><CardTitle className="flex items-center gap-2 text-white"><TicketPercent className="size-5 text-violet-400" /> Promo codes</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-violet-500/20 bg-slate-900/60 p-4 md:grid-cols-4">
        <div><Label className="text-xs text-cyan-300">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DIWALI" maxLength={32} className="mt-1 border-slate-700 bg-slate-950 text-white uppercase" /></div>
        <div><Label className="text-xs text-cyan-300">Discount %</Label><Input type="number" min="0.01" max="100" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 border-slate-700 bg-slate-950 text-white" /></div>
        <div><Label className="text-xs text-cyan-300">Max uses <span className="text-slate-500">(optional)</span></Label><Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" className="mt-1 border-slate-700 bg-slate-950 text-white" /></div>
        <div><Label className="text-xs text-cyan-300">Expires <span className="text-slate-500">(optional)</span></Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1 border-slate-700 bg-slate-950 text-white" /></div>
        <Button onClick={createCode} disabled={saving || !code.trim()} className="md:col-span-4 bg-violet-600 text-white hover:bg-violet-500"><>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Create promo code</></Button>
      </div>
      {loading ? <p className="text-sm text-slate-400">Loading promo codes…</p> : codes.length === 0 ? <p className="text-sm text-slate-400">No promo codes created yet.</p> : <div className="space-y-2">{codes.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3"><div><div className="flex items-center gap-2"><span className="font-mono font-bold text-white">{item.code}</span><Badge className={item.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}>{item.active ? "Active" : "Inactive"}</Badge></div><p className="mt-1 text-xs text-slate-400">{Number(item.discount_percent)}% bonus · {item.used_count}{item.max_uses ? `/${item.max_uses}` : ""} uses{item.expires_at ? ` · Expires ${new Date(item.expires_at).toLocaleDateString()}` : ""}</p></div><Button variant="outline" size="sm" onClick={() => toggleCode(item)} className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"><Power className="mr-2 size-3.5" />{item.active ? "Disable" : "Enable"}</Button></div>)}</div>}
    </CardContent>
  </Card>
}
