"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Check, Copy, Loader2, Pencil, Save, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { profileDetailsSchema, profileDate, type ParticipantProfile, type ProfileDetails } from "@/lib/participant-profile"
import { useToast } from "@/hooks/use-toast"

interface Props {
  participant: ParticipantProfile
  onSave: (details: ProfileDetails) => Promise<void>
}

export function ParticipantAccountProfile({ participant, onSave }: Props) {
  const id = useId()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ProfileDetails>({ full_name: "", username: "", bep20_address: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDetails, string>>>({})
  const [saveError, setSaveError] = useState("")
  const [copied, setCopied] = useState("")

  const beginEditing = () => {
    setDraft({ full_name: participant.full_name || "", username: participant.username || "", bep20_address: participant.bep20_address || participant.wallet_address || "" })
    setErrors({})
    setSaveError("")
    setEditing(true)
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: "Could not copy", description: "Select and copy the text manually.", variant: "destructive" })
    }
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const result = profileDetailsSchema.safeParse(draft)
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map(issue => [issue.path[0], issue.message])))
      return
    }
    setSaving(true)
    setSaveError("")
    try {
      await onSave(result.data)
      setEditing(false)
      toast({ title: "Profile updated", description: "Your changes have been saved to your account." })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your changes could not be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof ProfileDetails, value: string) => {
    setDraft(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  const wallet = participant.bep20_address || participant.wallet_address

  return (
    <form onSubmit={save} className="flex min-w-0 flex-col gap-8" aria-label="Personal profile">
      <section className="flex flex-col gap-6" aria-labelledby={`${id}-details`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={`${id}-details`} className="text-lg font-semibold tracking-tight">Personal details</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Your information, kept up to date.</p>
          </div>
          {!editing && <Button type="button" variant="outline" onClick={beginEditing} className="h-11 shrink-0"><Pencil data-icon="inline-start" />Edit</Button>}
        </div>

        {editing ? (
          <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.full_name)}>
              <FieldLabel htmlFor={`${id}-name`}>Full name</FieldLabel>
              <Input id={`${id}-name`} autoComplete="name" maxLength={100} value={draft.full_name} disabled={saving} onChange={event => update("full_name", event.target.value)} aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? `${id}-name-error` : undefined} />
              {errors.full_name && <FieldError id={`${id}-name-error`}>{errors.full_name}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor={`${id}-username`}>Username</FieldLabel>
              <Input id={`${id}-username`} autoComplete="username" required minLength={2} maxLength={50} value={draft.username} disabled={saving} onChange={event => update("username", event.target.value)} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? `${id}-username-error` : undefined} />
              {errors.username && <FieldError id={`${id}-username-error`}>{errors.username}</FieldError>}
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel>
              <Input id={`${id}-email`} type="email" value={participant.email} readOnly autoComplete="email" aria-describedby={`${id}-email-hint`} />
              <FieldDescription id={`${id}-email-hint`}>Your sign-in email. Contact support if you need to change it.</FieldDescription>
            </Field>
          </FieldGroup>
        ) : (
          <dl className="grid min-w-0 gap-x-8 gap-y-6 sm:grid-cols-2">
            <Detail label="Full name" value={participant.full_name || "Not added yet"} />
            <Detail label="Username" value={participant.username ? `@${participant.username}` : "Not added yet"} />
            <Detail label="Email address" value={participant.email} />
            <Detail label="Member since" value={profileDate(participant.created_at)} />
          </dl>
        )}
      </section>

      <Separator />

      <section className="flex min-w-0 flex-col gap-5" aria-labelledby={`${id}-wallet`}>
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-wallet`} className="text-lg font-semibold tracking-tight">Withdrawal wallet</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Your USDT destination on the BEP20 network.</p>
        </div>
        {editing ? (
          <FieldGroup>
            <Field data-invalid={Boolean(errors.bep20_address)}>
              <FieldLabel htmlFor={`${id}-address`}>BEP20 wallet address</FieldLabel>
              <Input id={`${id}-address`} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="0x…" value={draft.bep20_address} disabled={saving} onChange={event => update("bep20_address", event.target.value)} aria-invalid={Boolean(errors.bep20_address)} aria-describedby={`${id}-address-hint`} />
              {errors.bep20_address && <FieldError>{errors.bep20_address}</FieldError>}
              <FieldDescription id={`${id}-address-hint`}>Double-check the network and address before saving. Leave blank to remove it.</FieldDescription>
            </Field>
          </FieldGroup>
        ) : (
          <div className="flex min-w-0 items-start gap-3">
            <Wallet className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="break-all font-mono text-sm leading-relaxed">{wallet || "No withdrawal wallet added"}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{wallet ? "USDT · BNB Smart Chain (BEP20)" : "Add your wallet when you are ready to request a withdrawal."}</p>
            </div>
            {wallet && <Button type="button" variant="ghost" size="icon" aria-label="Copy wallet address" onClick={() => copy(wallet, "Wallet address")}>{copied === "Wallet address" ? <Check /> : <Copy />}</Button>}
          </div>
        )}
      </section>

      {saveError && <Alert variant="destructive"><AlertTitle>Changes not saved</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>}
      {editing && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="h-11" disabled={saving} onClick={() => { setEditing(false); setSaveError("") }}>Cancel</Button><Button type="submit" className="h-11" disabled={saving}>{saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}{saving ? "Saving changes…" : "Save changes"}</Button></div>}

      <Separator />

      <section className="flex min-w-0 flex-col gap-4" aria-labelledby={`${id}-referrals`}>
        <div className="flex flex-col gap-1"><h2 id={`${id}-referrals`} className="text-lg font-semibold tracking-tight">Invite your network</h2><p className="text-sm leading-relaxed text-muted-foreground">Your personal referral code.</p></div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0 break-all font-mono text-base font-medium tracking-wide">{participant.referral_code || "Not available yet"}</span>
          <Button type="button" variant="outline" className="h-11" disabled={!participant.referral_code} onClick={() => participant.referral_code && copy(participant.referral_code, "Referral code")}>{copied === "Referral code" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}Copy</Button>
        </div>
        <Link href="/participant/dashboard/refer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">View referral program<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </section>
    </form>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 flex-col gap-2"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">{value}</dd></div>
}
