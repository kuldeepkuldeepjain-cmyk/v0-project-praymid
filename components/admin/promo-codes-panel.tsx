"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { adminFetch } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Power, TicketPercent } from "lucide-react"

type DiscountType = "percent" | "fiat" | "inr"
type PromoCode = {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  active: boolean
  expires_at: string | null
  max_uses: number | null
  used_count: number
  created_at: string
}

function formatDiscount(item: PromoCode) {
  const value = Number(item.discount_value)
  if (item.discount_type === "percent") return `${value}% off`
  if (item.discount_type === "inr") return `₹${value.toLocaleString("en-IN")} off`
  return `$${value.toFixed(2)} off`
}

export function PromoCodesPanel() {
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<DiscountType>("percent")
  const [discountValue, setDiscountValue] = useState("5")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [saving, setSaving] = useState(false)
  const fetchCodes = useCallback(async (url: string) => {
    const response = await adminFetch(url)
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.message || "Unable to load promo codes")
    return Array.isArray(data.promoCodes) ? data.promoCodes as PromoCode[] : []
  }, [])
  const { data: codes = [], isLoading: loading, mutate } = useSWR<PromoCode[]>("/api/admin/promo-codes", fetchCodes, {
    onError: (error) => toast({ title: "Could not load promo codes", description: error.message || "Try again.", variant: "destructive" }),
  })

  const createCode = async () => {
    setSaving(true)
    try {
      const response = await adminFetch("/api/admin/promo-codes", {
        method: "POST",
        body: JSON.stringify({ code, discountType, discountValue, maxUses, expiresAt }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to create promo code")
      toast({ title: "Promo code created", description: `${code.trim().toUpperCase()} is ready for participant top-ups.` })
      setCode("")
      setDiscountType("percent")
      setDiscountValue("5")
      setMaxUses("")
      setExpiresAt("")
      await mutate()
    } catch (error) {
      toast({ title: "Could not create code", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleCode = async (item: PromoCode) => {
    try {
      const response = await adminFetch("/api/admin/promo-codes", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, active: !item.active }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to update promo code")
      await mutate()
    } catch (error) {
      toast({ title: "Could not update code", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    }
  }

  const valueLabel = discountType === "percent" ? "Discount %" : discountType === "inr" ? "Discount in INR" : "Discount in USD (fiat)"

  return (
    <Card className="border-violet-700/50 bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white"><TicketPercent className="size-5 text-violet-400" />Promo codes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <section className="rounded-xl border border-violet-500/20 bg-slate-900/60 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Create promo code</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Choose a percentage, USD, or INR discount for participant top-ups.</p>
            </div>
            <Badge className="w-fit bg-violet-500/15 text-violet-200">Admin only</Badge>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void createCode() }}>
            <FieldGroup className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="promo-code-name" className="text-xs text-cyan-300">Code</FieldLabel>
                <Input id="promo-code-name" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="DIWALI" maxLength={32} autoComplete="off" className="border-slate-700 bg-slate-950 text-white uppercase" />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="promo-discount-type" className="text-xs text-cyan-300">Discount type</FieldLabel>
                <select id="promo-discount-type" value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  <option value="percent">Percentage</option>
                  <option value="fiat">USD (fiat)</option>
                  <option value="inr">Indian rupees (INR)</option>
                </select>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="promo-discount-value" className="text-xs text-cyan-300">{valueLabel}</FieldLabel>
                <Input id="promo-discount-value" type="number" min="0.01" max={discountType === "percent" ? "100" : undefined} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} className="border-slate-700 bg-slate-950 text-white" />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="promo-max-uses" className="text-xs text-cyan-300">Max uses <span className="text-slate-500">(optional)</span></FieldLabel>
                <Input id="promo-max-uses" type="number" min="1" step="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Unlimited" className="border-slate-700 bg-slate-950 text-white" />
              </Field>
              <Field className="gap-1.5 md:col-span-2">
                <FieldLabel htmlFor="promo-expires-at" className="text-xs text-cyan-300">Expires <span className="text-slate-500">(optional)</span></FieldLabel>
                <Input id="promo-expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="border-slate-700 bg-slate-950 text-white" />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={saving || !code.trim() || !discountValue.trim()} className="mt-4 w-full bg-violet-600 text-white hover:bg-violet-500">
              {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
              Create promo code
            </Button>
          </form>
        </section>
        {loading ? <p className="text-sm text-slate-400">Loading promo codes…</p> : codes.length === 0 ? <p className="text-sm text-slate-400">No promo codes created yet.</p> : (
          <div className="flex flex-col gap-2">
            {codes.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold text-white">{item.code}</span><Badge className={item.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}>{item.active ? "Active" : "Inactive"}</Badge></div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{formatDiscount(item)} · {item.used_count}{item.max_uses ? `/${item.max_uses}` : ""} uses{item.expires_at ? ` · Expires ${new Date(item.expires_at).toLocaleDateString()}` : ""}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void toggleCode(item)} className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700">
                  <Power data-icon="inline-start" />{item.active ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
