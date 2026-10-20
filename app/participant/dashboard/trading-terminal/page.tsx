"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Maximize2 } from "lucide-react"
import { ForexTradingPlatform } from "@/components/forex-trading-platform"
import { PageLoader } from "@/components/ui/page-loader"
import { getFundedBaseAmount } from "@/lib/funded-account"
import { clearParticipantAuth, isParticipantAuthenticated, participantFetch } from "@/lib/auth"

type Participant = {
  email?: string
  username?: string
  account_balance?: number | string
  account_type?: string
  funded_amount?: number | string
  account_frozen?: boolean
  is_frozen?: boolean
  status?: string
  funded_breach_status?: string
}

export default function TradingTerminalPage() {
  const router = useRouter()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let active = true
    setMounted(true)

    if (!isParticipantAuthenticated()) {
      router.replace("/participant/login?redirect=/participant/dashboard/trading-terminal")
      return () => { active = false }
    }

    const stored = localStorage.getItem("participantData")
    const parsed = stored ? (JSON.parse(stored) as Participant) : null
    if (parsed && active) setParticipant(parsed)

    if (parsed?.email) {
      participantFetch(`/api/participant/me?email=${encodeURIComponent(parsed.email)}`)
        .then(async (response) => {
          if (!response.ok) return
          const data = await response.json()
          if (!active || !data.participant) return
          localStorage.setItem("participantData", JSON.stringify(data.participant))
          setParticipant(data.participant)
        })
        .catch(() => undefined)
    }

    return () => { active = false }
  }, [router])

  if (!mounted || !participant) return <PageLoader />

  const normalizedType = String(participant.account_type ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "")
  const isFundedAccount = normalizedType === "funded" || normalizedType === "fundedaccount"
  const walletBalance = Number(participant.account_balance) || 0
  const fundedAmount = getFundedBaseAmount(participant.account_balance, participant.funded_amount)
  const isFrozen = Boolean(
    participant.account_frozen ||
    participant.is_frozen ||
    participant.status === "frozen" ||
    participant.funded_breach_status === "breached",
  )

  return (
    <main className="min-h-screen bg-[#060b13] text-slate-100">
      <div className="flex min-h-10 items-center justify-between border-b border-[#1b3047] bg-[#08121f] px-3 py-2 sm:px-5">
        <Link href="/participant/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-cyan-300">
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
          <Maximize2 className="size-3.5" />
          Full trading terminal
        </div>
      </div>
      <ForexTradingPlatform
        participantEmail={participant.email ?? ""}
        walletBalance={walletBalance}
        isFundedAccount={isFundedAccount}
        fundedAmount={fundedAmount}
        isFrozen={isFrozen}
        fundedTopUpAvailable={isFundedAccount}
        onBalanceUpdated={(newBalance) => {
          const updated = { ...participant, account_balance: newBalance }
          localStorage.setItem("participantData", JSON.stringify(updated))
          setParticipant(updated)
        }}
        onAccountFrozen={() => {
          const updated = { ...participant, account_frozen: true }
          localStorage.setItem("participantData", JSON.stringify(updated))
          setParticipant(updated)
        }}
        onOpenSidebar={() => undefined}
        onAddFunds={() => router.push("/participant/dashboard/contribute")}
        onAddFundedFunds={() => router.push("/participant/dashboard/contribute")}
      />
      <button
        type="button"
        className="fixed bottom-3 right-3 z-30 rounded-lg border border-rose-400/25 bg-[#170f18] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200 shadow-xl transition hover:border-rose-300/50"
        onClick={() => {
          clearParticipantAuth()
          router.replace("/participant/login")
        }}
      >
        Sign out
      </button>
    </main>
  )
}
