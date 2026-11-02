"use client"

import { ArrowLeft, Bell, Info, Loader2, ShieldAlert, Wallet, X } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { PayoutBreakdown } from "@/components/participant-payout-summary"
import { formatPayoutAmount, type PayoutNetwork } from "@/lib/payout-presentation"

export interface PayoutDestinationValues {
  bep20Address: string
  upiId: string
  bankAccountName: string
  bankAccountNumber: string
  bankIfsc: string
}

export function PayoutConfirmationDialog({
  open, onOpenChange, network, values, onValueChange, isWithdrawing, amount, networkFee, amountAfterFee, onConfirm, presentation = "dialog",
}: {
  presentation?: "dialog" | "page"
  open: boolean
  onOpenChange: (open: boolean) => void
  network: PayoutNetwork
  values: PayoutDestinationValues
  onValueChange: (field: keyof PayoutDestinationValues, value: string) => void
  isWithdrawing: boolean
  amount: number
  networkFee: number
  amountAfterFee: number
  onConfirm: () => void
}) {
  const { bep20Address, upiId, bankAccountName, bankAccountNumber, bankIfsc } = values
  const destinationMissing = network.id === "INR"
    ? !upiId.trim() && !(bankAccountName.trim() && bankAccountNumber.trim() && bankIfsc.trim())
    : !bep20Address

  const content = (
    <>
        {presentation === "page" ? (
          <header className="payout-review-heading flex flex-col gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isWithdrawing}><ArrowLeft data-icon="inline-start" />Back to payout</Button>
            <h1 className="text-balance text-2xl font-semibold">Confirm withdrawal</h1>
            <p className="payout-muted text-pretty">{network.id === "INR" ? "Add your UPI or bank details, then review your request." : "Add your receiving wallet and double-check the details."}</p>
          </header>
        ) : (
          <DialogHeader>
            <div className="payout-dialog-heading"><DialogTitle>Confirm withdrawal</DialogTitle><DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Close withdrawal confirmation"><X data-icon="inline-start" aria-hidden="true" /></Button></DialogClose></div>
            <DialogDescription>{network.id === "INR" ? "Add your UPI or bank details, then review your request." : "Add your receiving wallet and double-check the details."}</DialogDescription>
          </DialogHeader>
        )}
        <div className="payout-dialog-body">
          <div className="payout-dialog-method">
            <div className="flex min-w-0 items-center gap-3"><span className="payout-heading-icon"><Wallet className="size-5" aria-hidden="true" /></span><div className="flex min-w-0 flex-col gap-1"><strong>{network.ticker}</strong><span className="payout-muted">{network.label}</span></div></div>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isWithdrawing}>Change</Button>
          </div>
          <FieldGroup>
            {network.id === "INR" ? (
              <>
                <Alert role="note"><Info aria-hidden="true" /><AlertTitle>Provide either UPI or bank details</AlertTitle><AlertDescription>You only need one complete receiving method. INR settlement is reviewed before processing.</AlertDescription></Alert>
                <Field>
                  <FieldLabel htmlFor="upiId">UPI ID <Badge variant="outline">Option 1</Badge></FieldLabel>
                  <Input id="upiId" placeholder="name@bank" value={upiId} onChange={(event) => onValueChange("upiId", event.target.value)} disabled={isWithdrawing} autoCapitalize="none" spellCheck={false} aria-describedby="upi-help" />
                  <FieldDescription id="upi-help">Optional if you complete all bank details below.</FieldDescription>
                </Field>
                <FieldSeparator>Or use a bank account</FieldSeparator>
                <FieldGroup className="payout-bank-fields">
                  <Field><FieldLabel htmlFor="bankAccountName">Account holder name</FieldLabel><Input id="bankAccountName" placeholder="As shown in bank records" value={bankAccountName} onChange={(event) => onValueChange("bankAccountName", event.target.value)} disabled={isWithdrawing} autoComplete="name" /></Field>
                  <Field><FieldLabel htmlFor="bankAccountNumber">Account number</FieldLabel><Input id="bankAccountNumber" inputMode="numeric" placeholder="Bank account number" value={bankAccountNumber} onChange={(event) => onValueChange("bankAccountNumber", event.target.value.replace(/\D/g, ""))} disabled={isWithdrawing} autoComplete="off" /></Field>
                  <Field><FieldLabel htmlFor="bankIfsc">IFSC code</FieldLabel><Input id="bankIfsc" placeholder="ABCD0123456" value={bankIfsc} onChange={(event) => onValueChange("bankIfsc", event.target.value.toUpperCase())} maxLength={11} disabled={isWithdrawing} autoComplete="off" spellCheck={false} /></Field>
                </FieldGroup>
              </>
            ) : (
              <Field>
                <FieldLabel htmlFor="bep20Address">{network.id} wallet address</FieldLabel>
                <Input id="bep20Address" type="text" placeholder={`Enter your ${network.id} address`} value={bep20Address} onChange={(event) => onValueChange("bep20Address", event.target.value)} disabled={isWithdrawing} autoCapitalize="none" autoComplete="off" spellCheck={false} className="font-mono" aria-describedby="payout-wallet-help" />
                <FieldDescription id="payout-wallet-help">{network.addressHint}. Use a receiving wallet that supports {network.ticker}.</FieldDescription>
              </Field>
            )}
          </FieldGroup>
          <Alert role="note"><ShieldAlert aria-hidden="true" /><AlertTitle>Double-check your destination</AlertTitle><AlertDescription>{network.id === "INR" ? "Verify the UPI ID or account number, holder name, and IFSC before confirming." : "The wallet and selected network must match. Funds sent to the wrong address or network may not be recoverable."}</AlertDescription></Alert>
          <div className="payout-dialog-summary"><PayoutBreakdown network={network} amount={amount} networkFee={networkFee} amountAfterFee={amountAfterFee} /></div>
          <p className="payout-inline-note"><Bell className="size-4 shrink-0" aria-hidden="true" />You&apos;ll be notified by email once the payout is sent and marked Completed in your history.</p>
        </div>
        <DialogFooter className="payout-confirmation-footer">
          <div className="payout-final-check">
            <div><span>Estimated to receive</span><strong>{formatPayoutAmount(amountAfterFee)} <span>USD</span></strong></div>
            <p>{formatPayoutAmount(amount)} request · {formatPayoutAmount(networkFee)} estimated fee</p>
          </div>
          <div className="payout-dialog-actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isWithdrawing}>Cancel</Button>
            <Button type="button" onClick={onConfirm} disabled={isWithdrawing || destinationMissing} className="payout-primary-action">
              {isWithdrawing ? <><Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />Processing...</> : <>Confirm withdrawal<Wallet data-icon="inline-end" aria-hidden="true" /></>}
            </Button>
          </div>
        </DialogFooter>
    </>
  )

  if (presentation === "page") return open ? <main className="participant-payout-workspace payout-review-page font-sans">{content}</main> : null
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent showCloseButton={false} className="participant-payout-workspace payout-dialog font-sans">{content}</DialogContent></Dialog>
}

export function PayoutDisputeDialog({ open, onOpenChange, reason, onReasonChange, processing, onSubmit, onCancel, presentation = "dialog" }: {
  presentation?: "dialog" | "page"
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (reason: string) => void
  processing: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const content = (
    <>
        {presentation === "page" ? (
          <header className="payout-review-heading flex flex-col gap-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={processing}><ArrowLeft data-icon="inline-start" />Back to payout</Button>
            <h1 className="text-balance text-2xl font-semibold">Report a missing payout</h1>
            <p className="payout-muted text-pretty">Tell us what happened so our team can review your payout.</p>
          </header>
        ) : (
          <DialogHeader>
            <div className="payout-dialog-heading"><DialogTitle>Report a missing payout</DialogTitle><DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Close payout dispute"><X data-icon="inline-start" aria-hidden="true" /></Button></DialogClose></div>
            <DialogDescription>Tell us what happened so our team can review your payout.</DialogDescription>
          </DialogHeader>
        )}
        <div className="payout-dialog-body">
          <Alert role="note"><ShieldAlert aria-hidden="true" /><AlertTitle>Check the receiving account first</AlertTitle><AlertDescription>Only raise a dispute if you genuinely did not receive the funds. False disputes may result in account suspension.</AlertDescription></Alert>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="disputeReason">Reason for dispute</FieldLabel>
              <Textarea id="disputeReason" placeholder="Describe what you checked, the receiving wallet or bank, and why you believe the payout is missing..." value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={5} disabled={processing} aria-describedby="dispute-reason-help" />
              <FieldDescription id="dispute-reason-help">{reason.trim().length} / 10 characters minimum. Include any relevant transfer details, but never share passwords or private keys.</FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={processing || reason.trim().length < 10} className="payout-primary-action">
            {processing ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <ShieldAlert data-icon="inline-start" aria-hidden="true" />}{processing ? "Submitting..." : "Submit dispute"}
          </Button>
        </DialogFooter>
    </>
  )
  if (presentation === "page") return open ? <main className="participant-payout-workspace payout-review-page font-sans">{content}</main> : null
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent showCloseButton={false} className="participant-payout-workspace payout-dialog font-sans">{content}</DialogContent></Dialog>
}
