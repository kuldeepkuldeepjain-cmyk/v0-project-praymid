"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { AlertCircle, CheckCircle2, Copy, Loader2, QrCode, ShieldCheck } from "lucide-react"
import { FundingUpiPayment } from "@/components/funding-upi-payment"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

function formatAmount(value: number) {
  return Number.isFinite(value) && value > 0
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—"
}

export function FundingSection({ number, title, description, children }: { number?: number; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="funding-panel">
      <CardHeader>
        <div className="flex items-center gap-3">
          {number && <span className="funding-section-number" aria-hidden="true">{number}</span>}
          <CardTitle><h3>{title}</h3></CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">{children}</CardContent>
    </Card>
  )
}

interface PaymentInstructionsProps {
  paymentMethod: "crypto" | "inr"
  network: string
  payableAmount: number
  inrRate: number
  inrDetails: { upiId: string | null; bankName: string | null; accountNumber: string | null; ifsc: string | null; holderName: string | null }
  inrPaymentUri: string | null
  onInrQrCreated: () => void
  selectedWalletAddress: string | null
  loadingAddress: boolean
  qrLoading: boolean
  qrDataUrl: string | null
  copiedAddress: boolean
  onCopyAddress: () => void
}

export function FundingPaymentInstructions({ paymentMethod, network, inrRate, inrDetails, inrPaymentUri, onInrQrCreated, selectedWalletAddress, loadingAddress, qrLoading, qrDataUrl, copiedAddress, onCopyAddress }: PaymentInstructionsProps) {

  return (
    <FundingSection
      number={2}
      title={paymentMethod === "inr" ? "Make your INR payment" : "Transfer your USDT"}
      description={paymentMethod === "inr" ? `The QR uses your payment amount, converted at ₹${inrRate} per $1.` : "Use the deposit address below and match your transfer network."}
    >
      {paymentMethod === "inr" ? (
        <>
          {loadingAddress ? <div role="status" aria-label="Loading INR payment details"><Skeleton className="h-48 w-full" /></div> : (
            <FundingUpiPayment paymentUri={inrPaymentUri} upiId={inrDetails.upiId} payeeName={inrDetails.holderName} onQrCreated={onInrQrCreated} />
          )}
          {!loadingAddress && inrDetails.accountNumber && inrDetails.ifsc && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">Prefer a bank transfer?</summary>
              <dl className="funding-bank-details">
                {inrDetails.holderName && <div><dt>Account holder</dt><dd>{inrDetails.holderName}</dd></div>}
                <div><dt>Account number</dt><dd className="font-mono">{inrDetails.accountNumber}</dd></div>
                {inrDetails.bankName && <div><dt>Bank</dt><dd>{inrDetails.bankName}</dd></div>}
                <div><dt>IFSC</dt><dd className="font-mono">{inrDetails.ifsc}</dd></div>
              </dl>
            </details>
          )}
        </>
      ) : loadingAddress ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading deposit address">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : selectedWalletAddress ? (
        <>
          <div className="funding-transfer-heading">
            <Badge variant="outline">{network === "ALL" ? "All networks" : network}</Badge>
            <span className="text-sm text-muted-foreground">USDT only</span>
          </div>
          <div className="funding-crypto-qr">
            <div className="funding-qr-well">
              {qrLoading ? <Loader2 className="size-5 animate-spin" aria-label="Generating deposit QR" /> : qrDataUrl ? (
                <Image unoptimized src={qrDataUrl} alt={`QR code for ${network} USDT deposit address`} width={144} height={144} />
              ) : <QrCode className="size-8" aria-hidden="true" />}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="font-medium">Scan with your wallet</p>
              <p className="text-sm leading-relaxed text-muted-foreground">Check the receiving address and network in your wallet before confirming the transfer.</p>
            </div>
          </div>
          <div className="funding-address-row">
            <code className="min-w-0 flex-1 break-all font-mono text-sm leading-relaxed">{selectedWalletAddress}</code>
            <Button type="button" variant="outline" size="icon" onClick={onCopyAddress} aria-label={copiedAddress ? "Deposit address copied" : "Copy deposit address"}>
              {copiedAddress ? <CheckCircle2 data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            </Button>
          </div>
          {copiedAddress && <p className="text-sm text-primary" role="status">Address copied!</p>}
          <p className="text-sm leading-relaxed text-muted-foreground">Send only USDT using the selected network, then add your transaction hash below.</p>
        </>
      ) : (
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Deposit address unavailable</AlertTitle>
          <AlertDescription>Deposit address not set. Please contact admin before sending a payment.</AlertDescription>
        </Alert>
      )}
    </FundingSection>
  )
}

interface FundingReviewSummaryProps {
  currentBalance: number
  parsedAmount: number
  payableAmount: number
  expectedCreditAmount: number
  paymentMethod: "crypto" | "inr"
  network: string
  inrRate: number
  isFundedTier: boolean
  promoCode?: string
  promoDiscountAmount: number
  isSubmitted?: boolean
}

export function FundingReviewSummary({ currentBalance, parsedAmount, payableAmount, expectedCreditAmount, paymentMethod, network, inrRate, isFundedTier, promoCode, promoDiscountAmount, isSubmitted = false }: FundingReviewSummaryProps) {
  return (
    <Card className="funding-panel funding-review-panel">
      <CardHeader>
        <CardTitle><h3>{isSubmitted ? "Request details" : "Your funding summary"}</h3></CardTitle>
        <CardDescription>{isFundedTier ? "Funded-tier account" : "Normal Add Fund"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="funding-summary-list">
          {!isSubmitted && <div><dt>Current balance</dt><dd>${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>}
          <div><dt>Funding amount</dt><dd>{formatAmount(parsedAmount)}</dd></div>
          <div><dt>Method</dt><dd>{paymentMethod === "inr" ? "UPI / Bank" : `USDT · ${network === "ALL" ? "All networks" : network}`}</dd></div>
          {promoCode && <div><dt>Promo savings <span className="funding-promo-label">{promoCode}</span></dt><dd className="text-primary">-${promoDiscountAmount.toFixed(2)}</dd></div>}
        </dl>
        <Separator />
        <dl className="funding-summary-list">
          <div><dt>Payment due</dt><dd>{formatAmount(payableAmount)} {Number.isFinite(payableAmount) && payableAmount > 0 ? paymentMethod === "inr" ? "USD" : "USDT" : ""}</dd></div>
          {paymentMethod === "inr" && Number.isFinite(payableAmount) && payableAmount > 0 && <div><dt>INR equivalent</dt><dd>₹{(payableAmount * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</dd></div>}
        </dl>
        <div className="funding-credit-total">
          <p className="text-sm text-muted-foreground">Credit after approval</p>
          <p>{formatAmount(expectedCreditAmount)}</p>
        </div>
      </CardContent>
      <CardFooter>
        <p className="funding-inline-note"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" /><span>{isSubmitted ? "Pending review · Instant Approval after manual review" : "Instant Approval after manual review"}</span></p>
      </CardFooter>
    </Card>
  )
}

interface FundingRequest {
  id: string
  amount: number
  transaction_id: string
  payment_method: string
  status: string
  created_at: string
  promo_code: string | null
  promo_bonus_amount: number | null
}

export function PendingFundingRequests({ requests, isLoading }: { requests: FundingRequest[]; isLoading: boolean }) {
  if (isLoading) return <p className="funding-inline-note" role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading your funding requests…</p>
  if (requests.length === 0) return null

  return (
    <Card className="funding-panel">
      <CardHeader>
        <CardTitle><h3>Pending Add Fund Requests</h3></CardTitle>
        <CardDescription>Your payment is being reviewed. You do not need to submit it again.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {requests.map((request) => (
          <article key={request.id} className="funding-pending-request">
            <div className="funding-transfer-heading">
              <p className="font-medium">${Number(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} payment</p>
              <Badge variant="secondary">{request.status.replace(/_/g, " ")}</Badge>
            </div>
            {request.promo_code && Number(request.promo_bonus_amount) > 0 && <p className="text-sm text-primary">${(Number(request.amount) + Number(request.promo_bonus_amount)).toFixed(2)} requested · {request.promo_code}</p>}
            <p className="text-sm leading-relaxed text-muted-foreground">{new Date(request.created_at).toLocaleString()} · {request.payment_method.replace(/_/g, " ")}</p>
            <p className="break-all font-mono text-sm text-muted-foreground">TX: {request.transaction_id.slice(0, 10)}…</p>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
