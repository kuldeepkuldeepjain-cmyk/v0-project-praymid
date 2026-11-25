"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import QRCode from "qrcode"
import { AlertCircle, Check, Copy, Loader2, QrCode, RefreshCw, ShieldCheck, Smartphone } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface FundingUpiPaymentProps {
  paymentUri: string | null
  upiId: string | null
  payeeName: string | null
  onQrCreated: () => void
}

export function FundingUpiPayment(props: FundingUpiPaymentProps) {
  // Remount on payment changes so an old QR or launch message cannot describe a new amount.
  return <UpiPaymentDetails key={props.paymentUri || "unavailable"} {...props} />
}

function UpiPaymentDetails({ paymentUri, upiId, payeeName, onQrCreated }: FundingUpiPaymentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [launchAttempted, setLaunchAttempted] = useState(false)
  const [desktopHint, setDesktopHint] = useState(false)

  useEffect(() => {
    if (!paymentUri) return
    let cancelled = false
    QRCode.toDataURL(paymentUri, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (cancelled) return
        setQrDataUrl(url)
        onQrCreated()
      })
      .catch(() => { if (!cancelled) setQrError(true) })
    return () => { cancelled = true }
  }, [paymentUri, refreshKey, onQrCreated])

  const amountLabel = paymentUri
    ? Number(new URL(paymentUri).searchParams.get("am")).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  async function copyUpiId() {
    if (!upiId) return
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Pay to {payeeName || "EliteFund"}</p>
        <div className="funding-address-row">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm text-muted-foreground">UPI ID</span>
            <code className="select-all break-all font-mono text-sm">{upiId || "Not configured"}</code>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={copyUpiId} disabled={!upiId} aria-label={copied ? "Copy UPI ID again" : "Copy UPI ID"}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          </Button>
        </div>
        {copied && !copyError && <p role="status" className="text-sm text-primary">UPI ID copied.</p>}
        {copyError && <p role="alert" className="text-sm text-muted-foreground">Clipboard unavailable. Select the UPI ID above and copy it manually.</p>}
      </div>

      {paymentUri ? (
        <>
          <div className="flex flex-col items-center gap-3">
            <p className="funding-payment-amount">₹{amountLabel} <span>INR</span></p>
            <div className="funding-qr-well">
              {qrDataUrl ? <Image unoptimized src={qrDataUrl} alt={`Scan to pay ₹${amountLabel} to ${upiId}`} width={192} height={192} /> : (
                <div className="flex size-48 items-center justify-center" role="status" aria-label={qrError ? "QR unavailable" : "Generating UPI QR"}>
                  {qrError ? <QrCode className="size-8 text-muted-foreground" aria-hidden="true" /> : <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />}
                </div>
              )}
            </div>
            <p className="text-center text-sm leading-relaxed text-muted-foreground">Scan with Google Pay, PhonePe, Paytm or another UPI app.</p>
            {qrError && <p role="alert" className="text-sm text-muted-foreground">QR could not be generated. Retry below or pay using the UPI ID.</p>}
          </div>
          <Button asChild className="funding-primary-action w-full">
            <a href={paymentUri} target="_top" aria-describedby="funding-upi-app-help" onClick={(event) => {
              const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
              if (!mobile) {
                event.preventDefault()
                setDesktopHint(true)
                return
              }
              setLaunchAttempted(true)
            }}>
              <Smartphone data-icon="inline-start" />Pay with UPI app
            </a>
          </Button>
          <p id="funding-upi-app-help" className="text-sm leading-relaxed text-muted-foreground">On your phone, open an installed UPI app with the payee and amount filled in. App availability depends on your device and browser.</p>
          {desktopHint && <Alert><Smartphone aria-hidden="true" /><AlertTitle>Use your phone to pay</AlertTitle><AlertDescription>Scan this QR with your phone, or open this checkout in your phone browser and tap Pay with UPI app.</AlertDescription></Alert>}
          {launchAttempted && <Alert><AlertCircle aria-hidden="true" /><AlertTitle>Complete payment in your UPI app</AlertTitle><AlertDescription>If no app opens, copy the UPI ID or scan the QR. After paying, return here and submit your UTR below. Do not pay again if your bank has already debited you.</AlertDescription></Alert>}
          <Button type="button" variant="outline" onClick={() => { setQrDataUrl(null); setQrError(false); setRefreshKey((value) => value + 1) }}>
            <RefreshCw data-icon="inline-start" />{qrError ? "Retry QR code" : "Refresh QR code"}
          </Button>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><ShieldCheck className="size-5 shrink-0" aria-hidden="true" /><span>Check the recipient and exact amount before entering your UPI PIN in your payment app. EliteFund never asks for your PIN. Funds are credited only after verification.</span></p>
        </>
      ) : (
        <Alert><QrCode aria-hidden="true" /><AlertTitle>Payment details not ready</AlertTitle><AlertDescription>Enter a valid funding amount and apply any promo code to generate your UPI payment link and QR. If the UPI ID is unavailable, contact support before paying.</AlertDescription></Alert>
      )}
    </div>
  )
}
