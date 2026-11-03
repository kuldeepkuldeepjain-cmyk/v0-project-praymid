"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowLeft, ArrowUpRight, Check, ChevronDown, Copy, Gift, Link2,
  Mail, MessageCircle, RefreshCw, Search, Share2, Users,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { participantFetch } from "@/lib/auth"

type ReferredUser = { username: string | null; created_at: string | null }
type ReferralData = {
  success: boolean
  referralCode: string
  referralLink: string
  referralCount: number
  referralEarnings: number
  referredUsers: ReferredUser[]
}

async function loadReferrals(url: string): Promise<ReferralData> {
  const response = await participantFetch(url, { cache: "no-store" })
  if (response.status === 401) throw new Error("Your session has expired. Sign in to view your referrals.")
  if (!response.ok) throw new Error("We couldn’t load your referrals. Please try again.")
  const data: ReferralData = await response.json()
  if (!data.success) throw new Error("We couldn’t load your referrals. Please try again.")
  return data
}

function ReferralLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading referral details">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  )
}

function ReferralOverview({ data }: { data: ReferralData }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby="referral-overview-title">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-xl flex-col gap-4">
          <Badge variant="outline" className="w-fit text-primary">THE REFERRAL PROGRAM</Badge>
          <h2 id="referral-overview-title" className="max-w-lg text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Share the opportunity. Earn $5 USDT.
          </h2>
          <p className="max-w-lg text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Invite someone with your personal link. When their account is funded with $50 or more, your $5 reward is credited automatically.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:gap-8 lg:border-l lg:border-t-0 lg:py-1 lg:pl-8">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Users className="size-4" aria-hidden="true" /> Friends joined</span>
            <strong className="text-3xl font-semibold tabular-nums text-foreground">{data.referralCount}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Gift className="size-4" aria-hidden="true" /> Rewards credited</span>
            <strong className="text-3xl font-semibold tabular-nums text-primary">${data.referralEarnings.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function ShareCard({ data }: { data: ReferralData }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState<"link" | "code" | null>(null)
  const message = "Join me on EliteFund. Use my link to create your account: " + data.referralLink
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
  const emailUrl = `mailto:?subject=${encodeURIComponent("An invitation to EliteFund")}&body=${encodeURIComponent(message)}`

  async function copy(text: string, target: "link" | "code") {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const element = document.createElement("textarea")
        element.value = text
        element.style.position = "fixed"
        element.style.opacity = "0"
        document.body.appendChild(element)
        element.select()
        const success = document.execCommand("copy")
        element.remove()
        if (!success) throw new Error("Copy failed")
      }
      setCopied(target)
      window.setTimeout(() => setCopied((current) => current === target ? null : current), 2400)
      toast({ title: target === "link" ? "Link copied" : "Code copied", description: "Ready to share with a friend." })
    } catch {
      toast({ title: "Couldn’t copy", description: "Please select and copy the text manually.", variant: "destructive" })
    }
  }

  async function share() {
    if (!navigator.share) {
      await copy(data.referralLink, "link")
      return
    }
    try {
      await navigator.share({ title: "Join me on EliteFund", text: "Join me on EliteFund with my invitation link.", url: data.referralLink })
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast({ title: "Sharing unavailable", description: "Copy the link instead.", variant: "destructive" })
      }
    }
  }

  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader className="gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Link2 className="size-5" aria-hidden="true" /></div>
        <CardTitle className="text-xl">Your invitation link</CardTitle>
        <CardDescription>One link, ready to share anywhere. Every signup through it is tracked for you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {data.referralLink ? (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-muted-foreground">PERSONAL LINK</p>
                <p className="break-all font-mono text-sm leading-6 text-foreground select-all">{data.referralLink}</p>
              </div>
              <Button onClick={() => copy(data.referralLink, "link")} className="shrink-0" aria-label="Copy referral link">
                {copied === "link" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Your code: <span className="font-mono font-semibold text-foreground select-all">{data.referralCode}</span></p>
              <Button size="sm" variant="ghost" onClick={() => copy(data.referralCode, "code")}>
                {copied === "code" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied === "code" ? "Copied" : "Copy code"}
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Send an invite</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle data-icon="inline-start" />WhatsApp</a></Button>
                <Button asChild variant="outline" size="sm"><a href={xUrl} target="_blank" rel="noopener noreferrer"><ArrowUpRight data-icon="inline-start" />Post on X</a></Button>
                <Button asChild variant="outline" size="sm"><a href={emailUrl}><Mail data-icon="inline-start" />Email</a></Button>
                <Button variant="outline" size="sm" onClick={share}><Share2 data-icon="inline-start" />Share</Button>
              </div>
            </div>
            <span role="status" aria-live="polite" className="sr-only">{copied ? `${copied === "link" ? "Referral link" : "Referral code"} copied` : ""}</span>
          </>
        ) : (
          <Alert className="border-border"><AlertTitle>Link not ready</AlertTitle><AlertDescription>Your referral code is not available yet. Refresh this page or contact support if this continues.</AlertDescription></Alert>
        )}
      </CardContent>
    </Card>
  )
}

function HowItWorks() {
  const steps = [
    { title: "Share your link", detail: "Send your personal invitation to someone new." },
    { title: "They join EliteFund", detail: "Their signup is linked to your referral code." },
    { title: "They fund $50+", detail: "$5 USDT is credited to your wallet when their funding qualifies." },
  ]
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader><CardTitle className="text-xl">How rewards work</CardTitle><CardDescription>Simple, transparent, and automatic.</CardDescription></CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-5">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-medium text-primary" aria-hidden="true">{index + 1}</span>
              <div className="flex flex-col gap-1"><p className="text-sm font-medium text-foreground">{step.title}</p><p className="text-sm leading-6 text-muted-foreground">{step.detail}</p></div>
            </li>
          ))}
        </ol>
        <Separator className="my-5" />
        <p className="text-xs leading-5 text-muted-foreground">Rewards are deposited directly into your account balance. There&apos;s no separate claim step.</p>
      </CardContent>
    </Card>
  )
}

function ReferralActivity({ users }: { users: ReferredUser[] }) {
  const [search, setSearch] = useState("")
  const [visibleCount, setVisibleCount] = useState(5)
  const matchingUsers = users.filter((user) => (user.username || "").toLowerCase().includes(search.trim().toLowerCase()))
  const visibleUsers = matchingUsers.slice(0, visibleCount)

  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1"><CardTitle className="text-xl">Your referrals</CardTitle><CardDescription>People who registered using your invitation.</CardDescription></div>
        <Badge variant="secondary" className="w-fit">{users.length} {users.length === 1 ? "person" : "people"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {users.length > 0 ? (
          <>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="referral-search" className="sr-only">Search referrals by username</label>
              <Input id="referral-search" placeholder="Search by username" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(5) }} className="pl-9" />
            </div>
            {visibleUsers.length > 0 ? (
              <ul className="divide-y divide-border">
                {visibleUsers.map((user, index) => {
                  const username = user.username?.trim() || "EliteFund member"
                  const timestamp = user.created_at ? new Date(user.created_at) : null
                  return (
                    <li key={`${user.username || "member"}-${user.created_at || index}-${index}`} className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{username}</p><p className="text-xs text-muted-foreground">{timestamp && !Number.isNaN(timestamp.getTime()) ? `Joined ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp)}` : "Joined EliteFund"}</p></div>
                      </div>
                      <Badge variant="outline" className="shrink-0">Joined</Badge>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="py-8 text-center text-sm text-muted-foreground">No referrals match that username.</p>}
            {matchingUsers.length > visibleCount && <Button variant="ghost" size="sm" className="self-center" onClick={() => setVisibleCount((count) => count + 5)}><ChevronDown data-icon="inline-start" />Show more</Button>}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center"><Users className="size-7 text-primary" aria-hidden="true" /><p className="font-medium text-foreground">Your first invite starts here</p><p className="text-sm text-muted-foreground">Share your link above. New signups will appear here.</p></div>
        )}
      </CardContent>
    </Card>
  )
}

export function ParticipantReferralsWorkspace() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/participant/referrals", loadReferrals, { revalidateOnFocus: true, shouldRetryOnError: false })

  return (
    <div className="participant-referral-workspace min-h-dvh bg-background font-sans text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/participant/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</Link>
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-primary">EliteFund / Rewards</span>
        </div>
      </header>
      <section aria-label="Referral overview" className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1"><h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Referrals</h1><p className="text-sm leading-6 text-muted-foreground">Your invitations, activity, and rewards in one place.</p></div>
          {data && <Button variant="ghost" size="sm" onClick={() => mutate()} disabled={isValidating}><RefreshCw data-icon="inline-start" className={isValidating ? "animate-spin" : ""} />Refresh</Button>}
        </div>
        {isLoading ? <ReferralLoading /> : error || !data ? (
          <Alert className="border-border bg-card text-foreground"><AlertTitle>Referrals unavailable</AlertTitle><AlertDescription className="flex flex-col items-start gap-4"><span>{error?.message || "We couldn’t load your referrals right now."}</span><span className="flex gap-2"><Button size="sm" onClick={() => mutate()}><RefreshCw data-icon="inline-start" />Try again</Button><Button size="sm" variant="outline" asChild><Link href="/participant/login">Sign in</Link></Button></span></AlertDescription></Alert>
        ) : (
          <>
            <ReferralOverview data={data} />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><ShareCard data={data} /><HowItWorks /></div>
            <ReferralActivity users={data.referredUsers} />
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowUpRight className="size-4" aria-hidden="true" />Rewards are credited automatically after qualifying funding is approved.</p>
          </>
        )}
      </section>
    </div>
  )
}
