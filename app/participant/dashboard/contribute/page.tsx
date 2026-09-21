"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoader } from "@/components/ui/page-loader"
import { TopUpModal } from "@/components/topup-modal"
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"

interface ParticipantData {
  email?: string
  username?: string
  wallet_balance?: number
  account_balance?: number
  account_type?: string
  account_frozen?: boolean
  is_frozen?: boolean
  status?: string
  funded_breach_status?: string
  top_up_count?: number
  has_prior_top_up?: boolean
}

export default function AddFundPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [accountDataLoaded, setAccountDataLoaded] = useState(false)
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (!isParticipantAuthenticated()) {
      router.push("/participant/login")
      return
    }

    const storedData = localStorage.getItem("participantData")
    if (!storedData) return

    try {
      const parsedData = JSON.parse(storedData) as ParticipantData
      setParticipantData(parsedData)

      if (parsedData.email) {
        participantFetch(`/api/participant/me?email=${encodeURIComponent(parsedData.email)}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.participant) {
              setParticipantData((previousData) => ({ ...previousData, ...data.participant }))
            }
          })
          .catch(() => {})
          .finally(() => setAccountDataLoaded(true))
      } else {
        setAccountDataLoaded(true)
      }
    } catch {
      localStorage.removeItem("participantData")
      router.push("/participant/login")
      setAccountDataLoaded(true)
    }
  }, [router])

  if (!mounted || !participantData || !accountDataLoaded) {
    return <PageLoader variant="subpage" />
  }

  const currentBalance = Number(participantData.wallet_balance ?? participantData.account_balance ?? 0)
  const isFundedAccountBreached = participantData.account_type === "funded" && participantData.funded_breach_status === "breached"
  const isFundedTopUp = isFundedAccountBreached

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <Link href="/participant/dashboard" aria-label="Back to dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Add Fund</h1>
            <p className="text-xs text-slate-500">Top up your trading wallet</p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <Card className="w-full max-w-lg overflow-hidden border-2 border-violet-200 shadow-lg">
          <CardContent className="p-0">
            <div className={`px-6 py-8 text-center text-white ${isFundedTopUp ? "bg-gradient-to-br from-emerald-600 to-teal-600" : "bg-gradient-to-br from-violet-600 to-indigo-600"}`}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold">{isFundedTopUp ? "Funded Account Top Up" : "Top Up Your Wallet"}</h2>
              <p className={`mx-auto mt-2 max-w-sm text-sm leading-relaxed ${isFundedTopUp ? "text-emerald-100" : "text-violet-100"}`}>
                {isFundedTopUp
                  ? "Choose a funded account tier and submit your USDT payment for approval."
                  : "Add funds to your trading wallet using USDT. Your balance will update after payment verification."}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Current balance</span>
                <span className="text-lg font-bold text-slate-900">${currentBalance.toFixed(2)} USDT</span>
              </div>

              {isFundedAccountBreached ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setShowTopUpModal(true)}
                    className="h-12 w-full bg-gradient-to-r from-red-600 to-orange-600 text-base font-semibold text-white shadow-md hover:from-red-700 hover:to-orange-700"
                  >
                    <Wallet className="mr-2 h-5 w-5" />
                    Add Funds to Reactivate
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-red-600">
                    Your funded account breached the 2% drawdown rule. Add funds to restore the minimum equity and request reactivation.
                  </p>
                </>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm leading-relaxed text-slate-600">
                  Add Funds and Top Up are available only after a funded account breach requires reactivation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentBalance={currentBalance}
        userId={participantData.username || participantData.email || ""}
        userEmail={participantData.email || ""}
        isFundedAccount={isFundedTopUp}
        onSuccess={(amount) => {
          setParticipantData((previousData) => previousData ? {
            ...previousData,
            has_prior_top_up: true,
            top_up_count: Number(previousData.top_up_count) + 1,
            wallet_balance: Number(previousData.wallet_balance ?? previousData.account_balance ?? 0) + amount,
            account_balance: Number(previousData.account_balance ?? 0) + amount,
          } : previousData)
        }}
      />
    </div>
  )
}
