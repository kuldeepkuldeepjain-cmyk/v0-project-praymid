"use client"

import { useId } from "react"
import { ArrowUpRight, CheckCircle2, Circle, Clock3, Info, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { MIN_WITHDRAWAL, PAYOUT_NETWORKS, QUICK_PERCENTAGES, formatPayoutAmount, type NetworkId, type PayoutNetwork } from "@/lib/payout-presentation"

interface PayoutRequestFormProps {
  selectedNetwork: NetworkId
  network: PayoutNetwork
  onNetworkChange: (network: NetworkId) => void
  walletBalance: number
  withdrawAmount: string
  onAmountChange: (amount: string) => void
  isFundedAccount: boolean
  fundedBaseAmount: number
  maximumFundedPayout: number
  isFrozenFundedAccount: boolean
  hasActivePayout: boolean
  canWithdraw: boolean
  onRequestWithdrawal: () => void
}

export function PayoutRequestForm({
  selectedNetwork, network, onNetworkChange, walletBalance, withdrawAmount, onAmountChange,
  isFundedAccount, fundedBaseAmount, maximumFundedPayout, isFrozenFundedAccount,
  hasActivePayout, canWithdraw, onRequestWithdrawal,
}: PayoutRequestFormProps) {
  const fieldId = useId()
  const amountId = `${fieldId}-amount`
  const enteredAmount = Number(withdrawAmount) || 0
  const fieldsDisabled = isFrozenFundedAccount || hasActivePayout
  const belowMinimum = enteredAmount > 0 && enteredAmount < MIN_WITHDRAWAL
  const exceedsBalance = enteredAmount > walletBalance
  const selectedPercentage = withdrawAmount
    ? QUICK_PERCENTAGES.find((percentage) => Number(((walletBalance * percentage) / 100).toFixed(2)) === enteredAmount)?.toString() ?? ""
    : ""

  return (
    <Card id={`${fieldId}-request`} className="payout-request-panel">
      <CardHeader>
        <div className="payout-panel-heading">
          <span className="payout-heading-icon"><ArrowUpRight className="size-5" aria-hidden="true" /></span>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle><h2>Request a withdrawal</h2></CardTitle>
            <CardDescription>Choose how you&apos;d like to receive your funds.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-disabled={fieldsDisabled}>
            <FieldLabel id={`${fieldId}-method-label`}>Payout method</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={selectedNetwork}
              onValueChange={(value) => { if (value) onNetworkChange(value as NetworkId) }}
              disabled={fieldsDisabled}
              aria-labelledby={`${fieldId}-method-label`}
              className="payout-network-options"
            >
              {PAYOUT_NETWORKS.map((option) => (
                <ToggleGroupItem key={option.id} value={option.id} aria-label={`${option.ticker}, ${option.label}, ${formatPayoutAmount(option.fee)} estimated fee`}>
                  <span className="payout-network-topline">
                    <span className="payout-network-name">{option.id === "INR" ? "UPI / Bank" : option.id}</span>
                    {selectedNetwork === option.id ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                  </span>
                  <span className="payout-network-description">{option.label}</span>
                  <span className="payout-network-fee">{option.fee === 0 ? "No network fee" : `${formatPayoutAmount(option.fee)} est. fee`}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription className="payout-inline-note">
              <Clock3 className="size-4 shrink-0" aria-hidden="true" />
              {network.eta} estimated transfer time, after processing.
            </FieldDescription>
          </Field>
          <Separator />
          {isFundedAccount ? (
            <Field>
              <FieldLabel>Funded profit payout</FieldLabel>
              <div className="payout-funded-amount">
                <span className="payout-muted">Your eligible payout</span>
                <strong>{formatPayoutAmount(maximumFundedPayout)} <span>USD</span></strong>
              </div>
              <FieldDescription>
                {maximumFundedPayout > 0
                  ? `Your payout is 90% of profit above your ${formatPayoutAmount(fundedBaseAmount)} funded allocation. The amount is calculated automatically.`
                  : `Profit payouts become available when your balance exceeds your ${formatPayoutAmount(fundedBaseAmount)} funded allocation.`}
              </FieldDescription>
            </Field>
          ) : (
            <Field data-disabled={fieldsDisabled} data-invalid={belowMinimum || exceedsBalance}>
              <div className="payout-field-label-row">
                <FieldLabel htmlFor={amountId}>Withdrawal amount</FieldLabel>
                <span className="payout-muted">USD</span>
              </div>
              <InputGroup className="payout-amount-input">
                <InputGroupInput
                  id={amountId}
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  disabled={fieldsDisabled}
                  aria-invalid={belowMinimum || exceedsBalance}
                  aria-describedby={`${fieldId}-amount-help ${fieldId}-amount-error`}
                />
                <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={() => onAmountChange(String(walletBalance))} disabled={fieldsDisabled} aria-label="Use maximum available balance">MAX</InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <ToggleGroup
                type="single"
                variant="outline"
                value={selectedPercentage}
                onValueChange={(value) => { if (value) onAmountChange(((walletBalance * Number(value)) / 100).toFixed(2)) }}
                disabled={fieldsDisabled}
                aria-label="Use a percentage of your available balance"
                className="payout-percentage-options"
              >
                {QUICK_PERCENTAGES.map((percentage) => (
                  <ToggleGroupItem key={percentage} value={String(percentage)} aria-label={`Use ${percentage}% of your available balance`}>{percentage}%</ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id={`${fieldId}-amount-help`}>Minimum {formatPayoutAmount(MIN_WITHDRAWAL)} · Available {formatPayoutAmount(walletBalance)}</FieldDescription>
              <div id={`${fieldId}-amount-error`} aria-live="polite">
                {belowMinimum && <FieldError>Minimum withdrawal is {formatPayoutAmount(MIN_WITHDRAWAL)}.</FieldError>}
                {exceedsBalance && <FieldError>This amount exceeds your available balance.</FieldError>}
              </div>
            </Field>
          )}
          {selectedNetwork === "INR" && (
            <Alert role="note">
              <Info aria-hidden="true" />
              <AlertTitle>Withdrawing to UPI or a bank?</AlertTitle>
              <AlertDescription>Your request is recorded in USD. INR conversion and settlement details are confirmed during review.</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button type="button" size="lg" onClick={onRequestWithdrawal} disabled={!canWithdraw} className="payout-primary-action w-full">
          <Wallet data-icon="inline-start" aria-hidden="true" />
          {isFundedAccount ? `Review ${formatPayoutAmount(maximumFundedPayout)} payout` : "Review withdrawal"}
          <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
        </Button>
        <p className="payout-action-caption">
          {hasActivePayout
            ? "Complete your current withdrawal before placing a new one."
            : !canWithdraw && isFundedAccount
              ? `Your balance must exceed ${formatPayoutAmount(fundedBaseAmount)} to unlock a profit payout.`
              : !canWithdraw
                ? exceedsBalance ? "Choose an amount within your available balance." : `Enter at least ${formatPayoutAmount(MIN_WITHDRAWAL)} to continue.`
                : "You’ll add your destination and confirm on the next screen."}
        </p>
      </CardFooter>
    </Card>
  )
}
