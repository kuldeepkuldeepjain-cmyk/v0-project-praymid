"use client"

import Link from "next/link"
import { ArrowLeft, Key, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TraderSecurityCenter } from "@/components/security/trader-security-center"

export default function SecurityPage() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  return <div className="min-h-screen bg-slate-950 text-slate-100"><header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur"><div className="flex items-center gap-3 px-4 py-4"><Link href="/participant/dashboard/profile"><Button variant="ghost" size="icon" aria-label="Back to profile"><ArrowLeft /></Button></Link><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Account controls</p><h1 className="text-lg font-semibold">Security center</h1></div></div></header><main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6"><TraderSecurityCenter /><Card className="border-slate-800 bg-slate-900/70"><CardContent className="p-5"><div className="mb-4 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Key className="size-5" /></div><div><h2 className="font-semibold">Change password</h2><p className="text-sm text-slate-500">Use a unique password and never share it with support.</p></div></div><div className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="current-password">Current password</Label><div className="relative"><Input id="current-password" type={showCurrent ? "text" : "password"} autoComplete="current-password" className="border-slate-700 bg-slate-950 pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowCurrent(!showCurrent)} aria-label={showCurrent ? "Hide current password" : "Show current password"}>{showCurrent ? <EyeOff /> : <Eye />}</Button></div></div><div className="flex flex-col gap-2"><Label htmlFor="new-password">New password</Label><div className="relative"><Input id="new-password" type={showNew ? "text" : "password"} autoComplete="new-password" minLength={12} className="border-slate-700 bg-slate-950 pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowNew(!showNew)} aria-label={showNew ? "Hide new password" : "Show new password"}>{showNew ? <EyeOff /> : <Eye />}</Button></div></div><Button disabled className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">Password changes are handled securely</Button></div></CardContent></Card></main></div>
}
