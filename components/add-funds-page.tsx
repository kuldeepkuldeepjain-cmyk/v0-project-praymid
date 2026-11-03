"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { participantFetch } from "@/lib/auth"
import { FundingCheckout } from "@/components/topup-modal"
import { PageLoader } from "@/components/ui/page-loader"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type FundingParticipant = {
  email: string
  username: string
  account_balance: number
  account_type: string
  funded_tier_top_up_count?: number
}

async function loadAccount(url: string): Promise<FundingParticipant> {
  const response = await participantFetch(url, { cache: "no-store" })
  if (response.status === 401) throw new Error("Your session has expired. Sign in to continue.")
  if (!response.ok) throw new Error("We couldn’t load your account. Please try again.")
  const data = await response.json()
  if (!data.participant) throw new Error("Your account details are unavailable.")
  return data.participant
}

export function AddFundsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: participant, error, isLoading, mutate } = useSWR("/api/participant/me", loadAccount, { revalidateOnFocus: false, shouldRetryOnError: false })

  if (isLoading) return <PageLoader variant="subpage" />
  if (error || !participant) return (
    <main className="participant-funding-workspace mobile-finance-message flex min-h-dvh flex-col gap-5 p-5 font-sans">
      <Link href="/participant/dashboard" className="flex min-h-11 items-center gap-2"><ArrowLeft className="size-5" />Back to dashboard</Link>
      <Alert variant="destructive"><AlertTitle>Unable to open Add Funds</AlertTitle><AlertDescription>{error?.message || "Your account details are unavailable."}</AlertDescription></Alert>
      <Button onClick={() => mutate()}><RefreshCw data-icon="inline-start" />Try again</Button>
      <Button variant="outline" asChild><Link href="/participant/login">Sign in</Link></Button>
    </main>
  )
  if (participant.account_type === "challenge") return (
    <main className="participant-funding-workspace mobile-finance-message flex min-h-dvh flex-col gap-5 p-5 font-sans">
      <h1 className="text-2xl font-semibold">Evaluation account</h1>
      <p className="text-pretty leading-relaxed">Deposits are not available during your challenge evaluation.</p>
      <Button asChild><Link href="/participant/dashboard">Back to dashboard</Link></Button>
    </main>
  )

  const isFunded = participant.account_type === "funded"
  return <FundingCheckout presentation="page" isOpen onClose={() => router.push("/participant/dashboard")} currentBalance={Number(participant.account_balance) || 0} userId={participant.username || participant.email} userEmail={participant.email} isFundedAccount={isFunded} isInitialFundedTopUp={isFunded && (params.get("initial") === "1" || Number(participant.funded_tier_top_up_count) === 0)} openFundedTier={params.get("tier") === "1"} initialAmount={Number(params.get("amount")) || undefined} initialFundingMode={params.get("mode") === "actual" ? "actual" : params.get("mode") === "funded" ? "funded" : undefined} />
}
