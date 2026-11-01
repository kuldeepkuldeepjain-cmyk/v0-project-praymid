"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Clock3, Info, ShieldCheck } from "lucide-react"
import { MIN_WITHDRAWAL, formatPayoutAmount, type PayoutNetwork, type PayoutRecord } from "@/lib/payout-presentation"

export function PayoutOverview({ walletBalance, isFundedAccount, fundedBaseAmount, maximumFundedPayout, history }: {
  walletBalance: number
  isFundedAccount: boolean
  fundedBaseAmount: number
  maximumFundedPayout: number
  history: PayoutRecord[]
}) {
  const completedPayouts = history.filter((payout) => payout.status === "completed")
  const totalPaid = completedPayouts.reduce((total, payout) => total + (Number(payout.amount) || 0), 0)

  return (
    <Card className="payout-overview-panel">
      <CardHeader>
        <div className="payout-overview-heading">
          <CardTitle><h2>Balance overview</h2></CardTitle>
          <Badge variant="outline">{isFundedAccount ? "Funded account" : "Trading account"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="payout-overview-values">
          <div className="payout-overview-balance">
            <dt>Account balance</dt>
            <dd>{formatPayoutAmount(walletBalance)} <span>USD</span></dd>
            <p>{isFundedAccount ? `${formatPayoutAmount(fundedBaseAmount)} funded allocation` : "Your current trading balance"}</p>
          </div>
          <div>
            <dt>{isFundedAccount ? "Eligible profit payout" : "Minimum withdrawal"}</dt>
            <dd>{formatPayoutAmount(isFundedAccount ? maximumFundedPayout : MIN_WITHDRAWAL)}</dd>
            <p>{isFundedAccount ? "Your 90% share of eligible profit" : "Per withdrawal request"}</p>
          </div>
          <div>
            <dt>Total paid out</dt>
            <dd>{formatPayoutAmount(totalPaid)}</dd>
            <p>{completedPayouts.length} completed {completedPayouts.length === 1 ? "payout" : "payouts"}</p>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

export function PayoutBreakdown({ network, amount, networkFee, amountAfterFee }: {
  network: PayoutNetwork
  amount: number
  networkFee: number
  amountAfterFee: number
}) {
  return (
    <div className="payout-breakdown">
      <dl className="payout-breakdown-lines">
        <div><dt>Withdrawal amount</dt><dd>{amount > 0 ? formatPayoutAmount(amount) : "—"}</dd></div>
        <div><dt>Estimated network fee</dt><dd>{networkFee > 0 ? `−${formatPayoutAmount(networkFee)}` : formatPayoutAmount(0)}</dd></div>
      </dl>
      <Separator />
      <dl className="payout-breakdown-total" aria-live="polite" aria-atomic="true">
        <div><dt>Estimated to receive</dt><dd>{amount > 0 ? formatPayoutAmount(amountAfterFee) : "—"}<span>USD</span></dd></div>
      </dl>
      <div className="payout-transfer-estimate">
        <Clock3 className="size-4 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1"><strong>{network.eta}</strong><span>Estimated transfer time after processing</span></div>
      </div>
    </div>
  )
}

export function PayoutSummary({ network, amount, networkFee, amountAfterFee, isFundedAccount }: {
  network: PayoutNetwork
  amount: number
  networkFee: number
  amountAfterFee: number
  isFundedAccount: boolean
}) {
  return (
    <aside aria-label="Payout summary and guidance" className="payout-sidebar">
      <Card className="payout-summary-panel">
        <CardHeader>
          <CardTitle><h2>Payout summary</h2></CardTitle>
          <CardDescription>Review the details before you continue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="payout-selected-method"><span>{network.ticker}</span><Badge variant="outline">{network.id === "INR" ? "Bank / UPI" : "Crypto"}</Badge></div>
          <PayoutBreakdown network={network} amount={amount} networkFee={networkFee} amountAfterFee={amountAfterFee} />
          <p className="payout-inline-note"><Info className="size-4 shrink-0" aria-hidden="true" />{network.id === "INR" ? "INR settlement details are confirmed during review." : "Network fees and transfer times are estimates, not a guaranteed arrival time."}</p>
        </CardContent>
        <CardFooter>
          <p className="payout-inline-note"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />Nothing is submitted until you confirm.</p>
        </CardFooter>
      </Card>
      <Card className="payout-guidance-panel">
        <CardHeader><CardTitle><h2>Good to know</h2></CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="eligibility">
              <AccordionTrigger>How much can I withdraw?</AccordionTrigger>
              <AccordionContent>
                {isFundedAccount
                  ? "Funded payouts use 90% of profit above your funded allocation. Your eligible amount is calculated automatically; the funded allocation is not withdrawable."
                  : "Choose an amount from your available balance, or use the percentage shortcuts or MAX. Payout requests have a $50 minimum."}
                {isFundedAccount && " Payout requests have a $50 minimum."}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="processing">
              <AccordionTrigger>When will my funds arrive?</AccordionTrigger>
              <AccordionContent>Every payout is reviewed before it is sent. The transfer estimate shown here starts after processing, not when you submit. You can follow the request in your withdrawal history.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="active">
              <AccordionTrigger>Can I request another payout?</AccordionTrigger>
              <AccordionContent>Only one withdrawal can be active at a time. Wait until your current request is completed before placing another.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="receipt">
              <AccordionTrigger>What if a payout hasn&apos;t arrived?</AccordionTrigger>
              <AccordionContent>First check the destination and transaction reference in your history. Once a payout is marked Sent, choose Yes, received to confirm it, or Not received to describe the issue for review.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </aside>
  )
}
