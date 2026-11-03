"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { DashboardPlanExplorer } from "@/components/dashboard-plan-explorer"
import { PageLoader } from "@/components/ui/page-loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { participantFetch } from "@/lib/auth"

async function loadParticipant(url: string): Promise<{ account_type: string }> {
  const response = await participantFetch(url, { cache: "no-store" })
  if (response.status === 401) throw new Error("Your session has expired. Sign in to continue.")
  if (!response.ok) throw new Error("We couldn’t load your account. Please try again.")
  const data = await response.json()
  if (!data.participant) throw new Error("Your account details are unavailable.")
  return data.participant
}

export function ParticipantPlansPage({ initialCategory }: { initialCategory?: "challenge" }) {
  const router = useRouter()
  const { data: participant, error, isLoading, mutate } = useSWR("/api/participant/me", loadParticipant, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  if (isLoading) return <PageLoader variant="subpage" />
  if (error || !participant) return (
    <div className="flex min-h-dvh flex-col gap-5 p-5 font-sans text-[color:var(--terminal-graphite-text)]">
      <Button asChild variant="ghost" className="self-start"><Link href="/participant/dashboard"><ArrowLeft data-icon="inline-start" />Back to dashboard</Link></Button>
      <Alert className="border-[color:var(--terminal-graphite-border)] text-[color:var(--terminal-graphite-text)]"><AlertTitle>Unable to open Plans</AlertTitle><AlertDescription>{error?.message || "Your account details are unavailable."}</AlertDescription></Alert>
      <div className="flex flex-wrap gap-3"><Button onClick={() => mutate()}><RefreshCw data-icon="inline-start" />Try again</Button><Button variant="outline" asChild><Link href="/participant/login">Sign in</Link></Button></div>
    </div>
  )

  const accountType = String(participant.account_type ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "")
  const planAccountType = accountType === "challenge" || accountType === "challengeaccount" ? "challenge" : accountType === "funded" || accountType === "fundedaccount" || accountType === "fundingtier" ? "funded" : "normal"

  return (
    <div className="page-fade-enter min-h-dvh pb-10 font-sans text-[color:var(--terminal-graphite-text)]">
      <header className="flex flex-col gap-3 px-4 pt-6 pb-3 sm:px-6 sm:pt-8">
        <Link href="/participant/dashboard" className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-medium text-[color:var(--terminal-graphite-muted)] transition hover:text-[color:var(--brand-primary)]"><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</Link>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Plans</h1>
        <p className="text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Find the right way to get started with EliteFund.</p>
      </header>
      <DashboardPlanExplorer
        accountType={planAccountType}
        initialCategory={initialCategory}
        onFund={(mode, amount) => {
          const params = new URLSearchParams({ mode: mode === "funded" ? "funded" : "actual", amount: String(amount), from: "plans" })
          if (mode === "funded") params.set("tier", "1")
          router.push(`/participant/dashboard/add-funds?${params}`)
        }}
      />
    </div>
  )
}
