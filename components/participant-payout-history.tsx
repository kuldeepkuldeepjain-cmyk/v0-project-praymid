"use client"

import { ArrowUpRight, Check, CheckCircle2, Clock3, FileText, Loader2, ShieldAlert, ThumbsUp, XCircle } from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatPayoutAmount, formatPayoutDate, getPayoutStatus, type PayoutRecord } from "@/lib/payout-presentation"

const STAGES = [
  { key: "pending", label: "Request", icon: FileText },
  { key: "processing", label: "Review", icon: Clock3 },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "completed", label: "Sent", icon: ArrowUpRight },
] as const

function PayoutProgress({ status }: { status: string }) {
  if (status === "rejected") return null
  const currentIndex = STAGES.findIndex((stage) => stage.key === (status === "assigned" ? "processing" : status))
  if (currentIndex < 0) return null

  return (
    <ol className="payout-progress" aria-label="Withdrawal progress">
      {STAGES.map((stage, index) => {
        const Icon = index < currentIndex ? Check : stage.icon
        return (
          <li key={stage.key} data-complete={index < currentIndex} data-current={index === currentIndex} aria-current={index === currentIndex ? "step" : undefined}>
            <span className="payout-progress-marker"><Icon className="size-4" aria-hidden="true" /></span>
            <span>{stage.label}<span className="sr-only">{index < currentIndex ? ", complete" : index === currentIndex ? ", current step" : ", upcoming"}</span></span>
          </li>
        )
      })}
    </ol>
  )
}

function DestinationDetails({ payout }: { payout: PayoutRecord }) {
  const destination = payout.wallet_address || payout.bep20_address
  if (!destination) return <div><dt>Destination</dt><dd>Not available</dd></div>

  if (payout.payout_method?.toUpperCase() === "INR") {
    let parsed: unknown
    try {
      parsed = JSON.parse(destination)
    } catch {}
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const details = parsed as Record<string, unknown>
      const fields = [["upiId", "UPI ID"], ["accountName", "Account holder"], ["accountNumber", "Account number"], ["ifsc", "IFSC code"]] as const
      if (fields.some(([key]) => typeof details[key] === "string" && details[key])) {
        return <>{fields.map(([key, label]) => typeof details[key] === "string" && details[key] ? <div key={key}><dt>{label}</dt><dd className={key === "accountName" ? undefined : "font-mono"}>{details[key] as string}</dd></div> : null)}</>
      }
    }
  }
  return <div className="payout-detail-wide"><dt>{payout.payout_method?.toUpperCase() === "INR" ? "Payment destination" : "Wallet address"}</dt><dd><code className="font-mono">{destination}</code></dd></div>
}

export function PayoutHistory({ id, payouts, processingPayoutActionId, onConfirmReceipt, onDispute }: {
  id: string
  payouts: PayoutRecord[]
  processingPayoutActionId: string | null
  onConfirmReceipt: (payoutId: string) => void
  onDispute: (payoutId: string) => void
}) {
  return (
    <Card id={id} className="payout-history-panel">
      <CardHeader>
        <CardTitle><h2>Withdrawal history</h2></CardTitle>
        <CardDescription>Follow every request, from review to receipt.</CardDescription>
        <CardAction><Badge variant="outline">{payouts.length} {payouts.length === 1 ? "request" : "requests"}</Badge></CardAction>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <Empty className="payout-empty-state">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ArrowUpRight aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No withdrawals yet</EmptyTitle>
              <EmptyDescription>Your payout requests will appear here, with progress updates and transfer details, once you submit your first withdrawal.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {payouts.map((payout) => {
              const status = getPayoutStatus(payout.status)
              const awaitingReceipt = payout.status === "completed" && !payout.participant_confirmed && !payout.dispute_status
              return (
                <article key={payout.id} className="payout-history-entry" aria-label={`${formatPayoutAmount(payout.amount)} withdrawal, ${status.label}`}>
                  <div className="payout-history-entry-heading">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="payout-history-icon">{payout.status === "rejected" ? <XCircle className="size-5" aria-hidden="true" /> : <ArrowUpRight className="size-5" aria-hidden="true" />}</span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="payout-history-amount">{formatPayoutAmount(payout.amount)} <span>USD</span></h3>
                        <p className="payout-muted">{payout.payout_method || "Method not recorded"} · {formatPayoutDate(payout.created_at || payout.requested_at)}</p>
                      </div>
                    </div>
                    <Badge variant={payout.status === "rejected" ? "destructive" : "outline"} data-status={payout.status}>
                      {payout.status === "completed" && <CheckCircle2 data-icon="inline-start" aria-hidden="true" />}
                      {status.label}
                    </Badge>
                  </div>
                  <p className="payout-status-description">{payout.status === "completed" && payout.participant_confirmed ? "You confirmed receipt of this payout." : status.description}</p>
                  <PayoutProgress status={payout.status} />
                  {payout.status === "rejected" && payout.admin_notes && (
                    <Alert variant="destructive" role="note"><XCircle aria-hidden="true" /><AlertTitle>Reason for rejection</AlertTitle><AlertDescription>{payout.admin_notes}</AlertDescription></Alert>
                  )}
                  <Accordion type="single" collapsible className="payout-transfer-details">
                    <AccordionItem value="transfer-details">
                      <AccordionTrigger>View transfer details<span className="sr-only"> for withdrawal {payout.id}</span></AccordionTrigger>
                      <AccordionContent>
                        <dl className="payout-detail-grid">
                          <div className="payout-detail-wide"><dt>Request ID</dt><dd><code className="font-mono">{payout.id}</code></dd></div>
                          <div><dt>Payout method</dt><dd>{payout.payout_method || "Not recorded"}</dd></div>
                          <div><dt>Requested</dt><dd>{formatPayoutDate(payout.created_at || payout.requested_at, true)}</dd></div>
                          {payout.processed_at && <div><dt>Processed</dt><dd>{formatPayoutDate(payout.processed_at, true)}</dd></div>}
                          {payout.wallet_balance_before != null && <div><dt>Balance before request</dt><dd>{formatPayoutAmount(payout.wallet_balance_before)}</dd></div>}
                          {payout.wallet_balance_after != null && <div><dt>Balance after request</dt><dd>{formatPayoutAmount(payout.wallet_balance_after)}</dd></div>}
                          <DestinationDetails payout={payout} />
                          {payout.transaction_hash && <div className="payout-detail-wide"><dt>Transaction / transfer reference</dt><dd><code className="font-mono">{payout.transaction_hash}</code></dd></div>}
                        </dl>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  {awaitingReceipt && (
                    <div className="payout-receipt-check">
                      <div className="flex flex-col gap-1"><h4>Has this payout arrived?</h4><p>Check your wallet or bank account before confirming receipt.</p></div>
                      <div className="payout-receipt-actions">
                        <Button type="button" onClick={() => onConfirmReceipt(payout.id)} disabled={processingPayoutActionId === payout.id} className="payout-primary-action">
                          {processingPayoutActionId === payout.id ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <ThumbsUp data-icon="inline-start" aria-hidden="true" />}
                          Yes, received
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onDispute(payout.id)} disabled={processingPayoutActionId === payout.id}><ShieldAlert data-icon="inline-start" aria-hidden="true" />Not received</Button>
                      </div>
                    </div>
                  )}
                  {payout.status === "completed" && payout.participant_confirmed === true && (
                    <Alert role="status"><CheckCircle2 aria-hidden="true" /><AlertTitle>Receipt confirmed</AlertTitle><AlertDescription>You confirmed this payout{payout.confirmed_at ? ` on ${formatPayoutDate(payout.confirmed_at)}` : ""}.</AlertDescription></Alert>
                  )}
                  {payout.status === "completed" && payout.dispute_status === "open" && (
                    <Alert role="status"><ShieldAlert aria-hidden="true" /><AlertTitle>Dispute under review</AlertTitle><AlertDescription>Your issue has been raised with our team. Keep the transfer details handy for the review.</AlertDescription></Alert>
                  )}
                  {payout.status === "completed" && payout.dispute_status && payout.dispute_status !== "open" && (
                    <Alert role="status"><ShieldAlert aria-hidden="true" /><AlertTitle>Dispute status: {payout.dispute_status.replaceAll("_", " ")}</AlertTitle><AlertDescription>Review any updates from the support team about this payout.</AlertDescription></Alert>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
      <CardFooter><p className="payout-inline-note"><FileText className="size-4 shrink-0" aria-hidden="true" />Request amounts are shown in USD. A Sent status is not a receipt confirmation.</p></CardFooter>
    </Card>
  )
}
