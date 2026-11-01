"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, ArrowRight, Bell, Camera, CheckCircle2, ChevronRight, Circle, Headphones, Loader2, LockKeyhole, LogOut, Shield, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ParticipantAccountProfile } from "@/components/participant-account-profile"
import { ParticipantIdentityVerification } from "@/components/participant-identity-verification"
import { ParticipantLedger } from "@/components/participant-ledger"
import { participantFetch, clearParticipantAuth } from "@/lib/auth"
import { accountLabel, prepareProfileImage, profileDate, verificationLabel, verificationState, type IdentityVerification, type ParticipantProfile } from "@/lib/participant-profile"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type ProfileResponse = { success: boolean; participant: ParticipantProfile }
type VerificationResponse = { success: boolean; verification: IdentityVerification | null }

async function profileRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await participantFetch(url, { cache: "no-store", ...options })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(result.error || "We could not load your account. Please try again."), { status: response.status })
  return result
}

export function ParticipantProfileWorkspace({ initialSection = "profile" }: { initialSection?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState(initialSection)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>("/api/participant/me", profileRequest, { errorRetryCount: 1 })
  const participant = data?.participant
  const { data: kycData, error: kycError, isLoading: kycLoading, isValidating: kycRefreshing, mutate: mutateKyc } = useSWR<VerificationResponse>(participant ? "/api/participant/kyc" : null, profileRequest, { errorRetryCount: 1, refreshInterval: current => verificationState(current?.verification?.status) === "review" ? 30_000 : 0 })
  const verification = kycData?.verification ?? null
  const state = verificationState(verification?.status)

  const saveProfile = async (updates: Record<string, string | null>) => {
    const saved = await profileRequest<ProfileResponse>("/api/participant/me", { method: "PATCH", body: JSON.stringify(updates) })
    await mutate(current => current ? { ...current, participant: { ...current.participant, ...saved.participant } } : saved, { revalidate: false })
  }

  const changePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file || photoBusy) return
    setPhotoBusy(true)
    setPhotoError("")
    try {
      await saveProfile({ profile_image: await prepareProfileImage(file, true) })
      toast({ title: "Profile photo updated" })
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : "Your photo could not be saved. Please try again.")
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    if (photoBusy) return
    setPhotoBusy(true)
    setPhotoError("")
    try { await saveProfile({ profile_image: null }); toast({ title: "Profile photo removed" }) } catch (cause) { setPhotoError(cause instanceof Error ? cause.message : "The photo could not be removed.") } finally { setPhotoBusy(false) }
  }

  const onSubmitted = async (record: IdentityVerification) => {
    await mutateKyc({ success: true, verification: record }, { revalidate: false })
    toast({ title: "Verification received", description: "Your submission status is now available in your profile." })
  }

  if (error && !participant) {
    const expired = error.status === 401
    return <div className="participant-profile-workspace flex min-h-dvh items-center justify-center px-4 py-12 font-sans"><div className="flex w-full max-w-md flex-col gap-5"><Shield className="size-8 text-primary" aria-hidden="true" /><h1 className="text-2xl font-semibold">{expired ? "Sign in to your account" : "Your profile is unavailable"}</h1><p className="text-sm leading-relaxed text-muted-foreground">{expired ? "Your session has expired. Sign in again to securely view your profile and verification." : error.message}</p>{expired ? <Button asChild className="h-11"><Link href="/participant/login">Sign in</Link></Button> : <Button className="h-11" onClick={() => void mutate()}>Try again</Button>}<Button asChild variant="ghost" className="h-11"><Link href="/participant/dashboard">Back to dashboard</Link></Button></div></div>
  }

  if (isLoading || !participant) return <div className="participant-profile-workspace min-h-dvh px-4 py-8 font-sans sm:px-8" aria-busy="true"><div className="mx-auto flex max-w-6xl flex-col gap-8"><span className="sr-only" role="status">Loading your profile</span><Skeleton className="h-6 w-32" /><Skeleton className="h-10 w-52" /><div className="flex items-center gap-4"><Skeleton className="size-16 rounded-xl" /><div className="flex flex-col gap-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-44" /></div></div><Skeleton className="h-12 w-full" /><Skeleton className="h-36 w-full" /></div></div>

  const displayName = participant.full_name || participant.username || participant.email.split("@")[0]
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase()
  const checks = [
    { label: "Personal details", detail: participant.full_name && participant.username ? "Your profile is up to date" : "Add your name and username", done: Boolean(participant.full_name && participant.username), section: "profile" },
    { label: "Withdrawal wallet", detail: participant.bep20_address || participant.wallet_address ? "BEP20 address added" : "Add when you are ready to withdraw", done: Boolean(participant.bep20_address || participant.wallet_address), section: "profile" },
    { label: "Identity verification", detail: kycLoading ? "Checking your status" : kycError ? "Status unavailable · try again" : state === "verified" ? "Your identity is confirmed" : state === "review" ? "Your documents are in review" : state === "rejected" ? "Review the feedback and try again" : "Verify with an ID and selfie", done: state === "verified", section: "verification" },
  ]

  return (
    <div className="participant-profile-workspace min-h-dvh font-sans">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8 sm:py-3">
          <Button asChild variant="ghost" className="h-11 px-0"><Link href="/participant/dashboard?view=terminal"><ArrowLeft data-icon="inline-start" /><span>Back to trading</span></Link></Button>
          <span className="text-sm font-semibold tracking-widest text-muted-foreground">ELITEFUND</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-8 pt-5 sm:gap-9 sm:px-8 sm:pb-12 sm:pt-10">
        <div className="flex flex-col gap-2"><p className="text-sm font-medium text-primary">YOUR ACCOUNT</p><h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">Profile & verification</h1><p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Your details. Your security. Everything in one place.</p></div>

        <section aria-label="Your account identity" className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <Button type="button" variant="ghost" className="size-16 shrink-0 overflow-hidden rounded-xl p-0 sm:size-20" disabled={photoBusy} onClick={() => photoInput.current?.click()} aria-label="Change profile photo"><Avatar className="size-full rounded-xl"><AvatarImage src={participant.profile_image || undefined} alt={`${displayName} profile photo`} /><AvatarFallback className="rounded-xl text-xl font-medium">{photoBusy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : initials}</AvatarFallback></Avatar></Button>
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={changePhoto} aria-label="Choose profile photo" />
            <div className="flex min-w-0 flex-1 flex-col gap-2"><h2 className="break-words text-xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-2xl">{displayName}</h2><p className="break-all text-sm leading-relaxed text-muted-foreground">{participant.email}</p><div className="flex flex-wrap gap-x-3 gap-y-1"><button type="button" disabled={photoBusy} onClick={() => photoInput.current?.click()} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary">{photoBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}{photoBusy ? "Updating…" : "Change photo"}</button>{participant.profile_image && <button type="button" disabled={photoBusy} onClick={() => void removePhoto()} className="min-h-11 text-sm text-muted-foreground">Remove</button>}</div></div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-col sm:items-end"><Badge variant="outline" className="max-w-full px-3 py-1.5">{accountLabel(participant.account_type)}</Badge><button type="button" className={cn("inline-flex items-center gap-2 text-sm font-medium", state === "rejected" ? "text-destructive" : "text-primary")} onClick={() => setSection("verification")} aria-label="View identity verification status">{state === "verified" ? <ShieldCheck className="size-4" aria-hidden="true" /> : <Shield className="size-4" aria-hidden="true" />}{kycLoading ? "Checking verification…" : kycError ? "Check verification status" : verificationLabel(verification?.status)}</button></div>
        </section>
        {photoError && <Alert variant="destructive"><AlertTitle>Photo not updated</AlertTitle><AlertDescription>{photoError}</AlertDescription></Alert>}

        <Tabs value={section} onValueChange={setSection} className="min-w-0">
          <TabsList className="profile-tabs" aria-label="Account sections"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="verification">Verification</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
          <div className={cn("grid min-w-0 gap-10 pt-7 sm:pt-8", section !== "activity" && "lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14")}>
            <div className="min-w-0">
              <TabsContent value="profile" className="m-0"><ParticipantAccountProfile participant={participant} onSave={saveProfile} /></TabsContent>
              <TabsContent value="verification" className="m-0">
                {kycLoading ? <div className="flex flex-col gap-5" aria-busy="true"><p role="status" className="text-sm text-muted-foreground">Checking your verification status…</p><Skeleton className="h-8 w-52" /><Skeleton className="h-52 w-full" /></div> : kycError && !kycData ? <Alert variant="destructive"><AlertTitle>Verification status unavailable</AlertTitle><AlertDescription className="flex flex-col items-start gap-4"><p>We could not check your latest submission. Refresh your status before starting a new request.</p><Button type="button" variant="outline" disabled={kycRefreshing} onClick={() => void mutateKyc()}>Try again</Button></AlertDescription></Alert> : <ParticipantIdentityVerification key={verification?.id || "new-verification"} participant={participant} verification={verification} onSubmitted={onSubmitted} onRefresh={() => mutateKyc()} refreshing={kycRefreshing} />}
              </TabsContent>
              <TabsContent value="activity" className="profile-ledger m-0 min-w-0"><div className="flex min-w-0 flex-col gap-6"><div className="flex flex-col gap-1"><h2 className="text-lg font-semibold">Account activity</h2><p className="text-sm leading-relaxed text-muted-foreground">Your funding, payouts, and transaction history.</p></div><ParticipantLedger participantId={participant.id} /></div></TabsContent>
            </div>

            {section !== "activity" && <aside className="flex min-w-0 flex-col gap-7 lg:border-l lg:border-border lg:pl-8" aria-label="Account checklist and settings">
              <section className="flex flex-col gap-4"><h2 className="text-sm font-semibold">Account checklist</h2><ul className="flex flex-col gap-1">{checks.map(check => <li key={check.label}><button type="button" onClick={() => setSection(check.section)} className="flex w-full items-start gap-3 py-3 text-left">{check.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}<span className="flex min-w-0 flex-col gap-1"><span className="text-sm font-medium">{check.label}</span><span className="text-sm leading-relaxed text-muted-foreground">{check.detail}</span></span></button></li>)}</ul>{state === "not_started" && !kycError && !kycLoading && <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setSection("verification")}>Verify identity<ArrowRight data-icon="inline-end" /></Button>}</section>
              <Separator />
              <nav className="flex flex-col gap-1" aria-label="Account settings">{[{ icon: Shield, label: "Security", detail: "Password & sign-in", href: "/participant/dashboard/settings/security" }, { icon: Bell, label: "Notifications", detail: "Your preferences", href: "/participant/dashboard/settings/notifications" }, { icon: Headphones, label: "Help & support", detail: "We’re here to help", href: "/participant/dashboard/settings/help" }].map(item => <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-3 py-2 text-foreground"><item.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-sm font-medium">{item.label}</span><span className="text-sm text-muted-foreground">{item.detail}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>)}</nav>
              <Separator />
              <div className="flex flex-col gap-4"><p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />Your personal account area. Only submit documents that belong to you.</p><Button type="button" variant="ghost" className="h-11 justify-start px-0" onClick={() => { clearParticipantAuth(); router.replace("/") }}><LogOut data-icon="inline-start" />Sign out</Button></div>
            </aside>}
          </div>
        </Tabs>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground"><span>EliteFund · Your account workspace</span><span>Member since {profileDate(participant.created_at)}</span></footer>
      </main>
    </div>
  )
}
