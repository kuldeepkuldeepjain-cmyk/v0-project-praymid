"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Circle, Clock3, FileCheck2, ImagePlus, Loader2, LockKeyhole, RefreshCw, ShieldCheck, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { participantFetch } from "@/lib/auth"
import { documentTypes, identityDetailsSchema, prepareProfileImage, profileDate, verificationState, type IdentityImages, type IdentityImageField, type IdentityVerification, type ParticipantProfile } from "@/lib/participant-profile"

interface Props {
  participant: ParticipantProfile
  verification: IdentityVerification | null
  onSubmitted: (verification: IdentityVerification) => Promise<void>
  onRefresh: () => Promise<unknown>
  refreshing: boolean
}

const imageFields = [
  { field: "document_front_url", label: "Document front", type: "kyc-front" },
  { field: "document_back_url", label: "Document back", type: "kyc-back" },
  { field: "selfie_url", label: "Your selfie", type: "kyc-selfie" },
] as const

export function ParticipantIdentityVerification({ participant, verification, onSubmitted, onRefresh, refreshing }: Props) {
  const id = useId()
  const state = verificationState(verification?.status)
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState({ legal_name: verification?.legal_name || participant.full_name || "", country: verification?.country || participant.country || "", date_of_birth: verification?.date_of_birth?.slice(0, 10) || "", document_type: verification?.document_type || "", document_number: verification?.document_number || "" })
  const [images, setImages] = useState<IdentityImages>({ document_front_url: "", document_back_url: "", selfie_url: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [cameraReady, setCameraReady] = useState(false)
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequested = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => {
    cameraRequested.current = false
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const updateDetail = (field: keyof typeof details, value: string) => {
    setDetails(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: "" }))
    setConfirmed(false)
  }

  const updateImage = (field: IdentityImageField, value: string) => {
    setImages(current => ({ ...current, [field]: value }))
    setError("")
    setConfirmed(false)
  }

  const moveTo = (next: number) => {
    setError("")
    if (next > 0) {
      const result = identityDetailsSchema.safeParse(details)
      if (!result.success) {
        setErrors(Object.fromEntries(result.error.issues.map(issue => [issue.path[0], issue.message])))
        setStep(0)
        requestAnimationFrame(() => headingRef.current?.closest("form")?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus())
        return
      }
    }
    if (next === 2 && imageFields.some(({ field }) => !images[field])) {
      setStep(1)
      setError("Add the document front, document back, and a clear selfie before continuing.")
      return
    }
    setStep(next)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const closeCamera = () => {
    cameraRequested.current = false
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
    setCameraReady(false)
  }

  const openCamera = async () => {
    setCameraError("")
    setCameraReady(false)
    setCameraOpen(true)
    cameraRequested.current = true
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable")
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } }, audio: false })
      if (!cameraRequested.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setCameraError("The camera could not open. Allow camera access in your browser, or close this window and upload a selfie from your gallery.")
    }
  }

  const captureSelfie = () => {
    const video = videoRef.current
    if (!video || !cameraReady || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext("2d")
    if (!context) { setCameraError("Could not capture the photo. Please use your gallery instead."); return }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    updateImage("selfie_url", canvas.toDataURL("image/jpeg", 0.8))
    closeCamera()
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (step < 2) { moveTo(step + 1); return }
    const parsed = identityDetailsSchema.safeParse(details)
    if (!parsed.success) { moveTo(0); setError("Please check your personal details before submitting."); return }
    if (!confirmed) { setError("Confirm that the documents are yours and the details are correct."); return }
    if (imageFields.some(({ field }) => !images[field])) { moveTo(1); setError("Add all three images before submitting."); return }
    setSubmitting(true)
    setError("")
    const uploaded = { ...images }
    try {
      for (const [index, { field, type, label }] of imageFields.entries()) {
        if (!uploaded[field].startsWith("data:")) continue
        setUploadStatus(`Uploading ${label.toLowerCase()} (${index + 1}/3)…`)
        const response = await participantFetch("/api/participant/upload-image", { method: "POST", body: JSON.stringify({ image: uploaded[field], type }), signal: AbortSignal.timeout(30_000) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.url) throw new Error(result.error || `${label} could not be uploaded. Please try again.`)
        uploaded[field] = result.url
        setImages(current => ({ ...current, [field]: result.url }))
      }
      setUploadStatus("Sending for review…")
      const response = await participantFetch("/api/participant/kyc", { method: "POST", body: JSON.stringify({ ...parsed.data, ...uploaded }), signal: AbortSignal.timeout(30_000) })
      const result = await response.json().catch(() => ({}))
      if (response.status === 409 && result.verification) { await onSubmitted(result.verification); return }
      if (!response.ok || !result.verification) throw new Error(result.error || "The request could not be submitted. Please try again.")
      await onSubmitted(result.verification)
    } catch (cause) {
      const message = cause instanceof Error && ["AbortError", "TimeoutError"].includes(cause.name) ? "The connection timed out. Refresh your verification status before retrying; a submitted request may already have been received." : cause instanceof Error ? cause.message : "We could not submit your documents. Please try again."
      setError(message)
    } finally {
      setSubmitting(false)
      setUploadStatus("")
    }
  }

  if (verification && ["review", "verified"].includes(state)) return <VerificationResult verification={verification} onRefresh={onRefresh} refreshing={refreshing} />

  return (
    <section className="flex min-w-0 flex-col gap-6" aria-label="Identity verification">
      <div className="flex flex-col gap-2"><p className="text-sm font-medium text-primary">Identity verification</p><h2 className="text-2xl font-semibold tracking-tight text-balance">A few steps. A verified you.</h2><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Confirm your identity with a government-issued document and a clear selfie. Your submission is reviewed by our team.</p></div>
      {state === "rejected" && <Alert variant="destructive"><FileCheck2 /><AlertTitle>Let&apos;s correct your submission</AlertTitle><AlertDescription className="flex flex-col gap-2"><p className="break-words">{verification?.rejection_reason || "Some details could not be verified. Check your information and upload clearer photos."}</p><p>Replace all three images before submitting again.</p></AlertDescription></Alert>}

      <ol className="flex min-w-0 gap-2" aria-label="Verification steps">
        {["Details", "Documents", "Review"].map((label, index) => <li key={label} className="min-w-0 flex-1"><button type="button" disabled={submitting} onClick={() => moveTo(index)} aria-current={step === index ? "step" : undefined} className={cn("flex w-full flex-col items-start gap-2 border-b-2 pb-3 text-left text-sm transition-colors", step === index ? "border-primary text-foreground" : "border-border text-muted-foreground")}><span className={cn("flex size-7 items-center justify-center rounded-full border text-sm", step >= index ? "border-primary/40 bg-primary/10 text-primary" : "border-border")}>{step > index ? <Check className="size-4" aria-hidden="true" /> : index + 1}</span>{label}</button></li>)}
      </ol>

      <form onSubmit={submit} className="flex min-w-0 flex-col gap-6" noValidate>
        <div className="flex flex-col gap-1"><p className="text-sm text-muted-foreground">Step {step + 1} of 3</p><h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">{["Tell us about yourself", "Add your photos", "Check before you submit"][step]}</h3></div>
        {step === 0 && <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.legal_name)} className="sm:col-span-2"><FieldLabel htmlFor={`${id}-legal-name`}>Full legal name</FieldLabel><Input id={`${id}-legal-name`} autoComplete="name" required maxLength={150} placeholder="Exactly as shown on your document" value={details.legal_name} onChange={event => updateDetail("legal_name", event.target.value)} aria-invalid={Boolean(errors.legal_name)} aria-describedby={errors.legal_name ? `${id}-name-error` : undefined} />{errors.legal_name && <FieldError id={`${id}-name-error`}>{errors.legal_name}</FieldError>}</Field>
          <Field data-invalid={Boolean(errors.country)}><FieldLabel htmlFor={`${id}-country`}>Country of residence</FieldLabel><Input id={`${id}-country`} autoComplete="country-name" required maxLength={100} placeholder="Country" value={details.country} onChange={event => updateDetail("country", event.target.value)} aria-invalid={Boolean(errors.country)} />{errors.country && <FieldError>{errors.country}</FieldError>}</Field>
          <Field data-invalid={Boolean(errors.date_of_birth)}><FieldLabel htmlFor={`${id}-birth`}>Date of birth</FieldLabel><Input id={`${id}-birth`} type="date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required value={details.date_of_birth} onChange={event => updateDetail("date_of_birth", event.target.value)} aria-invalid={Boolean(errors.date_of_birth)} />{errors.date_of_birth && <FieldError>{errors.date_of_birth}</FieldError>}</Field>
          <Field data-invalid={Boolean(errors.document_type)}><FieldLabel htmlFor={`${id}-document-type`}>Document type</FieldLabel><select id={`${id}-document-type`} required value={details.document_type} onChange={event => updateDetail("document_type", event.target.value)} aria-invalid={Boolean(errors.document_type)} className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base"><option value="">Select a document</option>{Object.entries(documentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.document_type && <FieldError>{errors.document_type}</FieldError>}</Field>
          <Field data-invalid={Boolean(errors.document_number)}><FieldLabel htmlFor={`${id}-document-number`}>Document number</FieldLabel><Input id={`${id}-document-number`} required maxLength={80} autoComplete="off" placeholder="As printed on your document" value={details.document_number} onChange={event => updateDetail("document_number", event.target.value)} aria-invalid={Boolean(errors.document_number)} />{errors.document_number && <FieldError>{errors.document_number}</FieldError>}</Field>
        </FieldGroup>}

        {step === 1 && <div className="flex min-w-0 flex-col gap-5">
          <p className="text-sm leading-relaxed text-muted-foreground">Use good lighting, keep every edge visible, and avoid glare. JPG, PNG, or WebP, up to 15 MB. Photos are optimized before upload.</p>
          {details.document_type === "passport" && <p className="text-sm leading-relaxed text-muted-foreground">For a passport, use the photo page as the front and the signature or additional identity page as the back.</p>}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {imageFields.map(({ field, label }) => <ImageUpload key={field} label={label} value={images[field]} disabled={submitting} onChange={value => updateImage(field, value)} onPreview={() => setPreview({ url: images[field], label })} onCamera={field === "selfie_url" ? openCamera : undefined} selfie={field === "selfie_url"} />)}
          </div>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />Photos are submitted only when you confirm the final step. Unsaved photos are cleared if you leave this page.</p>
        </div>}

        {step === 2 && <div className="flex min-w-0 flex-col gap-6">
          <dl className="grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">{[["Legal name", details.legal_name], ["Country", details.country], ["Date of birth", profileDate(details.date_of_birth)], ["Document", documentTypes[details.document_type]], ["Document number", `•••• ${details.document_number.slice(-4)}`]].map(([label, value]) => <div key={label} className="flex min-w-0 flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium">{value}</dd></div>)}</dl>
          <div className="flex min-w-0 gap-3">{imageFields.map(({ field, label }) => <button key={field} type="button" disabled={submitting} className="flex min-w-0 flex-1 flex-col gap-2 text-left" onClick={() => setPreview({ url: images[field], label })} aria-label={`Preview ${label.toLowerCase()}`}><Image src={images[field]} alt={label} width={800} height={800} unoptimized className="aspect-square h-auto w-full rounded-md border border-border bg-muted object-contain" /><span className="text-sm leading-snug text-muted-foreground">{label}</span></button>)}</div>
          <FieldGroup><Field orientation="horizontal" data-invalid={Boolean(error && !confirmed)}><Checkbox id={`${id}-confirm`} checked={confirmed} disabled={submitting} onCheckedChange={value => { setConfirmed(value === true); setError("") }} aria-invalid={Boolean(error && !confirmed)} /><FieldLabel htmlFor={`${id}-confirm`} className="min-w-0 flex-1 leading-relaxed">I confirm these documents are mine and my information is accurate.</FieldLabel></Field><FieldDescription>Our team will review your submission. You can check its status here without submitting it again.</FieldDescription></FieldGroup>
        </div>}

        {error && <Alert variant="destructive"><AlertTitle>{step === 2 ? "Submission needs attention" : "Check this step"}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <Separator />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? <Button type="button" variant="outline" className="h-11" disabled={submitting} onClick={() => moveTo(step - 1)}><ArrowLeft data-icon="inline-start" />Back</Button> : <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start"><ShieldCheck className="size-4" aria-hidden="true" />Manual identity review</span>}
          <Button type="submit" className="h-auto min-h-11 min-w-0 whitespace-normal py-3" disabled={submitting} aria-busy={submitting}>{submitting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : step === 2 ? <ShieldCheck data-icon="inline-start" /> : null}<span role={submitting ? "status" : undefined}>{submitting ? uploadStatus : step === 2 ? state === "rejected" ? "Resubmit for review" : "Submit for review" : step === 0 ? "Continue to documents" : "Review submission"}</span>{step < 2 && <ArrowRight data-icon="inline-end" />}</Button>
        </div>
      </form>

      <Dialog open={cameraOpen} onOpenChange={open => { if (!open) closeCamera() }}><DialogContent className="participant-profile-workspace max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Take a selfie</DialogTitle><DialogDescription>Face the camera in good light. Remove sunglasses and keep your full face visible.</DialogDescription></DialogHeader>{cameraError ? <Alert variant="destructive"><AlertTitle>Camera unavailable</AlertTitle><AlertDescription>{cameraError}</AlertDescription></Alert> : <video ref={node => { videoRef.current = node; if (node && streamRef.current) node.srcObject = streamRef.current }} autoPlay playsInline muted onLoadedData={() => setCameraReady(true)} aria-label="Live selfie camera" className="aspect-square w-full rounded-lg bg-muted object-cover" />}<p className="text-sm leading-relaxed text-muted-foreground">This photo is reviewed manually. It is not an automated liveness check.</p><div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="h-11" onClick={closeCamera}>Cancel</Button>{!cameraError && <Button type="button" className="h-11" disabled={!cameraReady} onClick={captureSelfie}><Camera data-icon="inline-start" />Capture selfie</Button>}</div></DialogContent></Dialog>
      <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null) }}><DialogContent className="participant-profile-workspace max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{preview?.label}</DialogTitle><DialogDescription>Check that the photo is sharp, complete, and readable.</DialogDescription></DialogHeader>{preview && <Image src={preview.url} alt={preview.label} width={1600} height={1200} unoptimized className="h-auto max-h-[65dvh] w-full object-contain" />}</DialogContent></Dialog>
    </section>
  )
}

function ImageUpload({ label, value, onChange, onPreview, onCamera, disabled, selfie }: { label: string; value: string; onChange: (value: string) => void; onPreview: () => void; onCamera?: () => void; disabled: boolean; selfie: boolean }) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const choose = async (file?: File) => {
    if (!file || disabled || processing) return
    setProcessing(true)
    setError("")
    try { onChange(await prepareProfileImage(file)) } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to read this image.") } finally { setProcessing(false) }
  }
  const onSelect = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file) }
  const busy = disabled || processing
  return <div className={cn("profile-upload-target flex min-w-0 flex-col gap-4 rounded-lg border border-dashed border-border p-4", selfie && "sm:col-span-2")} data-ready={Boolean(value)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void choose(event.dataTransfer.files[0]) }}>
    <div className="flex min-w-0 items-center justify-between gap-2"><h4 className="text-sm font-semibold">{label}</h4><Badge variant={value ? "secondary" : "outline"}>{value ? <Check className="mr-1 size-3.5" aria-hidden="true" /> : null}{processing ? "Preparing…" : value ? "Ready" : "Required"}</Badge></div>
    {value ? <button type="button" disabled={busy} onClick={onPreview} aria-label={`Preview ${label.toLowerCase()}`} className="min-w-0 rounded-md bg-muted"><Image src={value} alt={`${label} selected for verification`} width={1600} height={1000} unoptimized className={cn("h-auto max-h-44 w-full rounded-md object-contain", !selfie && "aspect-[8/5]")} /></button> : <div className={cn("flex min-h-24 flex-col items-center justify-center gap-2 text-center", !selfie && "sm:aspect-[8/5]")}>{processing ? <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" /> : selfie ? <Camera className="size-6 text-muted-foreground" aria-hidden="true" /> : <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />}<p className="text-sm leading-relaxed text-muted-foreground">{processing ? "Optimizing your photo…" : selfie ? "Your face, clearly visible" : "Clear photo, all edges visible"}</p></div>}
    <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} hidden aria-label={`Choose ${label.toLowerCase()}`} />
    <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture={selfie ? "user" : "environment"} onChange={onSelect} hidden aria-label={`Photograph ${label.toLowerCase()}`} />
    <div className="flex min-w-0 flex-wrap gap-2"><Button type="button" variant="outline" className="h-11 min-w-0 flex-1" disabled={busy} onClick={() => galleryRef.current?.click()}><Upload data-icon="inline-start" />{value ? "Replace" : "Upload"}</Button><Button type="button" variant="outline" className="h-11 min-w-0 flex-1" disabled={busy} onClick={() => onCamera ? onCamera() : cameraRef.current?.click()}><Camera data-icon="inline-start" />Camera</Button>{value && <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange("")}><X /></Button>}</div>
    {error && <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>}
  </div>
}

function VerificationResult({ verification, onRefresh, refreshing }: { verification: IdentityVerification; onRefresh: () => Promise<unknown>; refreshing: boolean }) {
  const verified = verificationState(verification.status) === "verified"
  const milestones = [
    { title: "Submission received", detail: profileDate(verification.submitted_at), complete: true },
    { title: "Compliance review", detail: verified ? "Review completed" : "Our team is checking your details and documents.", complete: verified },
    { title: "Verification decision", detail: verified ? `Approved · ${profileDate(verification.reviewed_at)}` : "Your result will appear here when the review is complete.", complete: verified },
  ]
  return <section className="flex min-w-0 flex-col gap-7" aria-label="Identity verification status"><div className="flex flex-col items-start gap-4">{verified ? <ShieldCheck className="size-10 text-primary" aria-hidden="true" /> : <Clock3 className="size-10 text-primary" aria-hidden="true" />}<Badge variant="secondary">{verified ? "Identity verified" : "In review"}</Badge><div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold tracking-tight text-balance">{verified ? "You’re verified. All set." : "Your documents are in review."}</h2><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{verified ? "Your identity verification is complete. No further documents are needed right now." : "Your submission has been received. There is no need to upload it again. You can return to your account while our team reviews it."}</p></div></div><ol className="flex flex-col gap-6" aria-label="Verification progress">{milestones.map(({ title, detail, complete }, index) => <li key={title} className="flex items-start gap-3">{complete ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /> : index === 1 ? <Clock3 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}<div className="flex min-w-0 flex-col gap-1"><p className="text-sm font-medium">{title}</p><p className="text-sm leading-relaxed text-muted-foreground">{detail}</p></div></li>)}</ol><Separator /><dl className="grid min-w-0 gap-5 sm:grid-cols-2">{[["Legal name", verification.legal_name], ["Document", documentTypes[verification.document_type] || verification.document_type], ["Country", verification.country], ["Reference", verification.id.slice(0, 8).toUpperCase()]].map(([label, value]) => <div key={label} className="flex min-w-0 flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium">{value}</dd></div>)}</dl><div className="flex flex-col gap-3 sm:flex-row"><Button type="button" variant="outline" className="h-11" disabled={refreshing} onClick={() => void onRefresh()}><RefreshCw data-icon="inline-start" className={cn(refreshing && "animate-spin")} />{refreshing ? "Checking…" : "Refresh status"}</Button><Button asChild variant="ghost" className="h-11"><Link href="/participant/dashboard/settings/help">Contact support</Link></Button></div></section>
}
