"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { clearParticipantAuth, participantFetch } from "@/lib/auth"

type GatewayConfig = {
  vpa: string
  payeeName: string
  rate: number
  minUsd: number
  maxUsd: number
}

type UpiRequest = {
  id: string
  amount: string | number
  transaction_id: string | null
  status: string
  created_at: string
  admin_notes: string | null
}

const PRESETS = [50, 100, 250, 500, 1000]
const QR_LIFETIME_SECONDS = 5 * 60

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  processing: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  rejected: "border-rose-400/30 bg-rose-400/10 text-rose-300",
}

function formatInr(value: number) {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function EliteFundUpiGateway() {
  const { toast } = useToast()
  const [gateway, setGateway] = useState<GatewayConfig>({
    vpa: "",
    payeeName: "EliteFund",
    rate: 104,
    minUsd: 5,
    maxUsd: 100000,
  })
  const [requests, setRequests] = useState<UpiRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [utr, setUtr] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [upiLink, setUpiLink] = useState("")
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [qrNonce, setQrNonce] = useState(0)
  const [lastSubmitted, setLastSubmitted] = useState<{ amount: number; utr: string } | null>(null)

  const loadGateway = useCallback(async () => {
    try {
      const response = await participantFetch("/api/participant/upi", { cache: "no-store" })
      if (response.status === 401) {
        clearParticipantAuth()
        window.location.assign("/participant/login?reason=session-expired")
        return
      }
      const data = await response.json()
      if (response.ok && data.success) {
        setGateway(data.gateway)
        setRequests(Array.isArray(data.requests) ? data.requests : [])
      }
    } catch {
      setFormError("Unable to reach the EliteFund UPI gateway. Check your connection and retry.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGateway()
  }, [loadGateway])

  const inrAmount = useMemo(() => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return 0
    return Number((value * gateway.rate).toFixed(2))
  }, [amount, gateway.rate])

  useEffect(() => {
    if (!gateway.vpa || inrAmount <= 0) {
      setQrDataUrl(null)
      setUpiLink("")
      setExpiresAt(null)
      setSecondsRemaining(0)
      return
    }

    const link = `upi://pay?pa=${encodeURIComponent(gateway.vpa)}&pn=${encodeURIComponent(gateway.payeeName)}&am=${inrAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("EliteFund wallet top-up")}`
    setUpiLink(link)
    setExpiresAt(Date.now() + QR_LIFETIME_SECONDS * 1000)
    setSecondsRemaining(QR_LIFETIME_SECONDS)

    let cancelled = false
    QRCode.toDataURL(link, { width: 360, margin: 1, color: { dark: "#0a111b", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [gateway.vpa, gateway.payeeName, inrAmount, qrNonce])

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => setSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const qrExpired = expiresAt !== null && secondsRemaining <= 0
  const countdownLabel = `${String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:${String(secondsRemaining % 60).padStart(2, "0")}`

  const copyVpa = async () => {
    if (!gateway.vpa) return
    try {
      await navigator.clipboard.writeText(gateway.vpa)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", description: "Select the UPI ID and copy it manually.", variant: "destructive" })
    }
  }

  const submitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError("")

    const value = Number(amount)
    if (!Number.isFinite(value) || value < gateway.minUsd) {
      setFormError(`Enter at least $${gateway.minUsd} to continue.`)
      return
    }
    if (!/^[A-Za-z0-9]{8,40}$/.test(utr.trim())) {
      setFormError("Enter the UPI reference (UTR) from your payment app. It is 8 to 40 letters or digits.")
      return
    }

    setSubmitting(true)
    try {
      const response = await participantFetch("/api/participant/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: value, utr: utr.trim(), note: note.trim() }),
      })
      if (response.status === 401) {
        clearParticipantAuth()
        window.location.assign("/participant/login?reason=session-expired")
        return
      }
      const data = await response.json()
      if (!response.ok || !data.success) {
        setFormError(data.message || "Unable to submit this UPI payment.")
        return
      }

      setLastSubmitted({ amount: value, utr: utr.trim().toUpperCase() })
      setUtr("")
      setNote("")
      toast({ title: "UPI payment submitted", description: "EliteFund will verify the reference and credit your wallet." })
      await loadGateway()
    } catch {
      setFormError("Network error. Your payment was not submitted.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d6b66b] text-sm font-black tracking-tight text-[#0a111b]">
            EF
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d6b66b]">EliteFund</p>
            <h1 className="text-balance text-xl font-semibold text-white sm:text-2xl">UPI Payment Gateway</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-[#0a111b] px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-300">
            1 USD = <span className="font-mono text-white">₹{gateway.rate}</span>
          </span>
        </div>
      </header>

      <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-slate-400">
        Collect funds into your EliteFund wallet with UPI. Scan the QR or open your UPI app, pay the exact INR amount,
        then confirm the reference so the team can verify and credit your balance.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section
          aria-labelledby="elitefund-payment-heading"
          className="rounded-2xl border border-slate-800 bg-[#0a111b] p-4 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-[#d6b66b]" aria-hidden="true" />
            <h2 id="elitefund-payment-heading" className="text-sm font-semibold text-white">
              Payment amount
            </h2>
          </div>

          <div className="mt-4">
            <Label htmlFor="elitefund-amount" className="text-xs font-medium text-slate-400">
              Amount to add (USD)
            </Label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                $
              </span>
              <Input
                id="elitefund-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="100"
                value={amount}
                onChange={(event) => {
                  const next = event.target.value.replace(/[^0-9.]/g, "")
                  setAmount(next)
                  setFormError("")
                }}
                className="h-12 border-slate-700 bg-[#070d15] pl-7 text-lg font-semibold text-white placeholder:text-slate-600"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {inrAmount > 0 ? (
                <>
                  You pay <span className="font-mono font-semibold text-[#d6b66b]">₹{formatInr(inrAmount)}</span> at the
                  current rate.
                </>
              ) : (
                <>Minimum ${gateway.minUsd}. The INR amount updates as you type.</>
              )}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = Number(amount) === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(String(preset))
                    setFormError("")
                  }}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-[#d6b66b] bg-[#d6b66b]/15 text-[#d6b66b]"
                      : "border-slate-700 bg-[#070d15] text-slate-300 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  ${preset}
                </button>
              )
            })}
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
              <div className="relative shrink-0 rounded-xl bg-white p-2.5">
                {qrDataUrl && !qrExpired ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI payment QR code for ₹${formatInr(inrAmount)} to ${gateway.payeeName}`}
                    width={168}
                    height={168}
                    className="block size-[168px]"
                  />
                ) : (
                  <div className="grid size-[168px] place-items-center rounded-lg bg-slate-100 text-center">
                    {loading ? (
                      <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden="true" />
                    ) : (
                      <div className="px-3">
                        <QrCode className="mx-auto size-6 text-slate-400" aria-hidden="true" />
                        <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
                          {qrExpired ? "QR expired. Refresh to continue." : "Enter an amount to generate the QR."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pay to</p>
                <p className="mt-1 text-sm font-semibold text-white">{gateway.payeeName}</p>

                <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                  <code className="truncate rounded-md border border-slate-700 bg-[#070d15] px-2 py-1 font-mono text-xs text-slate-200">
                    {gateway.vpa || "Loading UPI ID"}
                  </code>
                  <button
                    type="button"
                    onClick={copyVpa}
                    disabled={!gateway.vpa}
                    aria-label="Copy EliteFund UPI ID"
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-40"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 sm:justify-start">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {inrAmount > 0 ? (
                    qrExpired ? (
                      <span className="text-rose-300">QR expired</span>
                    ) : (
                      <span>
                        QR valid for <span className="font-mono text-slate-200">{countdownLabel}</span>
                      </span>
                    )
                  ) : (
                    <span>QR stays valid for 5 minutes</span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {upiLink && !qrExpired ? (
                    <a
                      href={upiLink}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#d6b66b] px-3 py-2 text-xs font-semibold text-[#0a111b] transition hover:bg-[#e2c684]"
                    >
                      <Smartphone className="size-3.5" aria-hidden="true" />
                      Open UPI app
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setQrNonce((value) => value + 1)}
                    disabled={inrAmount <= 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-40"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Refresh QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section
            aria-labelledby="elitefund-confirm-heading"
            className="rounded-2xl border border-slate-800 bg-[#0a111b] p-4 sm:p-5"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#d6b66b]" aria-hidden="true" />
              <h2 id="elitefund-confirm-heading" className="text-sm font-semibold text-white">
                Confirm your payment
              </h2>
            </div>

            <form onSubmit={submitPayment} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="elitefund-utr" className="text-xs font-medium text-slate-400">
                  UPI reference (UTR)
                </Label>
                <Input
                  id="elitefund-utr"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={40}
                  placeholder="e.g. 402318765432"
                  value={utr}
                  onChange={(event) => {
                    setUtr(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
                    setFormError("")
                  }}
                  className="mt-2 h-11 border-slate-700 bg-[#070d15] font-mono text-sm tracking-wide text-white placeholder:text-slate-600"
                />
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                  Find this 12-digit reference in your UPI app payment history.
                </p>
              </div>

              <div>
                <Label htmlFor="elitefund-note" className="text-xs font-medium text-slate-400">
                  Note <span className="font-normal text-slate-600">(optional)</span>
                </Label>
                <Input
                  id="elitefund-note"
                  autoComplete="off"
                  maxLength={180}
                  placeholder="Payment reference for the team"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 h-11 border-slate-700 bg-[#070d15] text-sm text-white placeholder:text-slate-600"
                />
              </div>

              {formError ? (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs leading-5 text-rose-200">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {formError}
                </p>
              ) : null}

              {lastSubmitted ? (
                <p className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs leading-5 text-emerald-200">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    ${lastSubmitted.amount.toFixed(2)} submitted with reference{" "}
                    <span className="font-mono">{lastSubmitted.utr}</span>. Status is pending verification.
                  </span>
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting || loading}
                className="h-11 w-full bg-[#d6b66b] text-sm font-semibold text-[#0a111b] hover:bg-[#e2c684] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Submitting
                  </>
                ) : (
                  "Submit UPI payment"
                )}
              </Button>
            </form>
          </section>

          <section
            aria-labelledby="elitefund-history-heading"
            className="rounded-2xl border border-slate-800 bg-[#0a111b] p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="elitefund-history-heading" className="text-sm font-semibold text-white">
                Recent UPI payments
              </h2>
              <span className="text-[11px] font-medium text-slate-500">{requests.length} total</span>
            </div>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading payment history
              </div>
            ) : requests.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs leading-5 text-slate-500">
                No UPI payments yet. Your submitted references appear here with their verification status.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-800">
                {requests.map((request) => {
                  const status = String(request.status || "pending").toLowerCase()
                  return (
                    <li key={request.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">${Number(request.amount).toFixed(2)}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                          {request.transaction_id || "No reference"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {new Date(request.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          STATUS_TONE[status] || "border-slate-700 bg-slate-800/60 text-slate-300"
                        }`}
                      >
                        {status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-3">
        {[
          { step: "01", title: "Scan or open UPI", detail: "Use any UPI app to scan the QR or open the payment link." },
          { step: "02", title: "Pay the exact amount", detail: "Send the INR amount shown so the reference matches." },
          { step: "03", title: "Confirm the reference", detail: "Submit the UTR and EliteFund credits your wallet." },
        ].map(({ step, title, detail }) => (
          <div key={step} className="bg-[#0a111b] p-4">
            <span className="font-mono text-[10px] font-semibold text-[#d6b66b]">{step}</span>
            <h3 className="mt-1.5 text-xs font-semibold text-white">{title}</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
