"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ArrowRight, ChevronRight, Clock3, QrCode, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FundingSection } from "@/components/funding-checkout-sections"
import { PageLoader } from "@/components/ui/page-loader"
import { TopUpModal } from "@/components/topup-modal"
import { getParticipantData, isParticipantAuthenticated, participantFetch } from "@/lib/auth"

interface ParticipantData {
  email?: string
  username?: string
  wallet_balance?: number
  account_balance?: number
  account_type?: string
  account_frozen?: boolean
  is_frozen?: boolean
  status?: string
  funded_breach_status?: string
  top_up_count?: number
  has_prior_top_up?: boolean
  has_funded_tier_top_up?: boolean
}

export default function AddFundPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [accountDataLoaded, setAccountDataLoaded] = useState(false)
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [openFundedTier, setOpenFundedTier] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (!isParticipantAuthenticated()) {
      router.push("/participant/login")
      return
    }

    const storedData = localStorage.getItem("participantData")
    const sessionData = getParticipantData()
    if (!storedData && !sessionData) {
      setAccountDataLoaded(true)
      return
    }

    try {
      const parsedData = storedData
        ? JSON.parse(storedData) as ParticipantData
        : { email: sessionData?.email, username: sessionData?.username, account_balance: 0 } as ParticipantData
      setParticipantData(parsedData)

      if (parsedData.email) {
        participantFetch("/api/participant/me")
          .then((response) => response.json())
          .then((data) => {
            if (data.participant) {
              setParticipantData((previousData) => ({ ...previousData, ...data.participant }))
            }
          })
          .catch(() => {})
          .finally(() => setAccountDataLoaded(true))
      } else {
        setAccountDataLoaded(true)
      }
    } catch {
      localStorage.removeItem("participantData")
      router.push("/participant/login")
      setAccountDataLoaded(true)
    }
  }, [router])

  if (!mounted || !participantData || !accountDataLoaded) {
    return <PageLoader variant="subpage" />
  }

  const currentBalance = Number(participantData.wallet_balance ?? participantData.account_balance ?? 0)
  const normalizedAccountType = String(participantData.account_type ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "")
  const isFundedAccount = normalizedAccountType === "funded" || normalizedAccountType === "fundedaccount" || normalizedAccountType === "fundingtier"
  const isFundedAccountBreached = isFundedAccount && participantData.funded_breach_status === "breached"
  const hasFundedTierTopUp = Boolean(participantData.has_funded_tier_top_up)
  const canUseFundedTier = isFundedAccount && !hasFundedTierTopUp

  return (
    <div className="participant-funding-workspace funding-landing font-sans">
      <header className="funding-landing-header">
        <div className="funding-header-inner">
          <Button asChild variant="outline" size="icon">
            <Link href="/participant/dashboard" aria-label="Back to dashboard"><ArrowLeft data-icon="inline-start" /></Link>
          </Button>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Wallet &amp; funding</p>
            <p className="text-sm text-muted-foreground">Your EliteFund trading account</p>
          </div>
        </div>
      </header>

      <main className="funding-landing-content">
        <div className="funding-heading">
          <p className="funding-kicker">Account funding</p>
          <h1 className="funding-page-title text-balance">Add funds. Keep moving.</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">Fund your trading wallet with USDT or INR. Choose your amount, make your transfer, and submit the reference for review.</p>
        </div>

        {isFundedAccountBreached && (
          <Alert variant="destructive" className="funding-error">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Account reactivation required</AlertTitle>
            <AlertDescription>Your funded account breached the 2% drawdown rule. Add funds to restore the minimum equity and request reactivation.</AlertDescription>
          </Alert>
        )}

        <div className="funding-landing-grid">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="funding-balance-card">
              <CardHeader>
                <CardDescription>Current trading balance</CardDescription>
                <CardTitle>
                  <p className="funding-balance-value">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span>USDT</span></p>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{isFundedAccountBreached ? "Top up your funded account and request reactivation after your payment is approved." : "Choose UPI, bank transfer, or a supported USDT network in checkout. Your balance updates after payment verification."}</p>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="button" onClick={() => { setOpenFundedTier(false); setShowTopUpModal(true) }} className="funding-primary-action h-12 w-full">
                  {isFundedAccountBreached ? "Add Funds to Reactivate" : "Add Funds"}<ArrowRight data-icon="inline-end" />
                </Button>
                <p className="funding-inline-note"><Clock3 className="size-4" aria-hidden="true" />Payment review takes up to 24 hours</p>
              </CardFooter>
            </Card>

            <Link href="/participant/dashboard/upi" className="funding-gateway-link">
              <QrCode className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">EliteFund UPI Gateway</span>
                <span className="text-sm leading-relaxed text-muted-foreground">Pay in INR with any UPI app and confirm your reference.</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>

            {isFundedAccount && (
              <Card className="funding-panel">
                <CardHeader>
                  <div className="funding-plan-heading"><CardTitle><h2>Funded-tier funding</h2></CardTitle><Badge variant="outline">{canUseFundedTier ? "First deposit" : "Already used"}</Badge></div>
                  <CardDescription>{canUseFundedTier ? "Choose a funded account tier in checkout. Available only for your first funded deposit." : "Funded-tier funding has already been used. Normal Add Fund is still available."}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button type="button" variant="outline" disabled={!canUseFundedTier} onClick={() => { setOpenFundedTier(true); setShowTopUpModal(true) }} className="h-12 w-full">
                    <ShieldCheck data-icon="inline-start" />{canUseFundedTier ? "Funded-tier Fund" : "Funded-tier Fund Used"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          <FundingSection title="A clear path to funding" description="Three steps, with your payment details in one place.">
            <ol className="funding-guide">
              {[
                { title: "Choose your method", description: "Select USDT or pay in INR through UPI or bank transfer." },
                { title: "Transfer the exact amount", description: "Use the payment details in checkout. For crypto, match the selected network." },
                { title: "Submit your reference", description: "Add your transaction hash or UPI transaction ID / UTR so the team can review your payment." },
              ].map((item, index) => (
                <li key={item.title}>
                  <span className="funding-section-number" aria-hidden="true">{index + 1}</span>
                  <div className="flex min-w-0 flex-col gap-1"><h3 className="font-medium text-foreground">{item.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>
                </li>
              ))}
            </ol>
            <Separator />
            <p className="funding-inline-note"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" /><span>Check pending requests in checkout before sending another payment.</span></p>
          </FundingSection>
        </div>
      </main>

      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentBalance={currentBalance}
        userId={participantData.username || participantData.email || ""}
        userEmail={participantData.email || ""}
        isFundedAccount={isFundedAccount}
        openFundedTier={openFundedTier}
        fundedTierAvailable={canUseFundedTier}
        onSuccess={(amount) => {
          setParticipantData((previousData) => previousData ? {
            ...previousData,
            has_prior_top_up: true,
            has_funded_tier_top_up: openFundedTier ? true : previousData.has_funded_tier_top_up,
            top_up_count: Number(previousData.top_up_count) + 1,
            wallet_balance: Number(previousData.wallet_balance ?? previousData.account_balance ?? 0) + amount,
            account_balance: Number(previousData.account_balance ?? 0) + amount,
          } : previousData)
        }}
      />
    </div>
  )
}
