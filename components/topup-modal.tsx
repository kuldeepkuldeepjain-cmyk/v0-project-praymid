"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import QRCode from "qrcode"
import { ArrowLeft, X, Wallet, CheckCircle2, AlertCircle, Loader2, Send, Landmark } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FundingPaymentInstructions, FundingReviewSummary, FundingSection, PendingFundingRequests } from "@/components/funding-checkout-sections"
import { cn } from "@/lib/utils"
import { FUNDED_PLANS } from "@/lib/funded-account"
import { useToast } from "@/hooks/use-toast"
import { clearParticipantAuth, participantFetch } from "@/lib/auth"

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  userId: string
  userEmail?: string
  onSuccess?: (amount: number) => void
  isFundedAccount?: boolean
  isInitialFundedTopUp?: boolean
  openFundedTier?: boolean
  fundedTierAvailable?: boolean
  initialAmount?: number
  initialFundingMode?: "actual" | "funded"
}

type Step = "form" | "submitting" | "success"
type PromoDiscountType = "percent" | "fiat" | "inr"
type AppliedPromo = { code: string; discountType: PromoDiscountType; discountValue: number }

function calculatePromoDiscount(baseAmount: number, promo: AppliedPromo, inrRate: number) {
  const discount = promo.discountType === "percent"
    ? baseAmount * promo.discountValue / 100
    : promo.discountType === "inr"
      ? promo.discountValue / (inrRate > 0 ? inrRate : 104)
      : promo.discountValue
  return Number(Math.min(baseAmount, Math.max(0, discount)).toFixed(2))
}

function describePromoDiscount(promo: AppliedPromo) {
  if (promo.discountType === "percent") return `${promo.discountValue}% off your payment.`
  if (promo.discountType === "inr") return `₹${promo.discountValue.toLocaleString("en-IN")} off your UPI payment.`
  return `$${promo.discountValue.toFixed(2)} off your payment.`
}

export function TopUpModal(props: TopUpModalProps) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const { isOpen, onClose, isFundedAccount, isInitialFundedTopUp, openFundedTier, initialAmount, initialFundingMode } = props

  useEffect(() => {
    if (!isOpen || !isMobile) return
    const query = new URLSearchParams()
    if (isFundedAccount) query.set("account", "funded")
    if (isInitialFundedTopUp) query.set("initial", "1")
    if (openFundedTier) query.set("tier", "1")
    if (initialAmount && Number.isFinite(initialAmount)) query.set("amount", String(initialAmount))
    if (initialFundingMode) query.set("mode", initialFundingMode)
    router.push(`/participant/dashboard/add-funds${query.size ? `?${query}` : ""}`)
    onClose()
  }, [isOpen, isMobile, isFundedAccount, isInitialFundedTopUp, openFundedTier, initialAmount, initialFundingMode, router, onClose])

  if (isMobile) return null
  return <FundingCheckout {...props} />
}

export function FundingCheckout({ isOpen, onClose, currentBalance, userId, userEmail, onSuccess, isFundedAccount = false, isInitialFundedTopUp = false, openFundedTier = false, fundedTierAvailable, initialAmount, initialFundingMode, presentation = "dialog" }: TopUpModalProps & { presentation?: "dialog" | "page" }) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>("form")
  const [amount, setAmount] = useState("")
  const [txHash, setTxHash] = useState("")
  const [note, setNote] = useState("")
  const [promoCode, setPromoCode] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)
  const [promoMessage, setPromoMessage] = useState("")
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [walletAddresses, setWalletAddresses] = useState<{ TRC20: string | null; BEP20: string | null; ERC20: string | null }>({ TRC20: null, BEP20: null, ERC20: null })
  const [network, setNetwork] = useState<"ALL" | "TRC20" | "BEP20" | "ERC20" | "INR">("ALL")
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "inr">("crypto")
  const DEFAULT_INR_UPI_ID = "elitefun@slc"
  const [inrDetails, setInrDetails] = useState<{ upiId: string | null; bankName: string | null; accountNumber: string | null; ifsc: string | null; holderName: string | null }>({ upiId: DEFAULT_INR_UPI_ID, bankName: null, accountNumber: null, ifsc: null, holderName: null })
  const [inrRate, setInrRate] = useState(104)
  const [inrQrDataUrl, setInrQrDataUrl] = useState<string | null>(null)
  const [inrQrExpiresAt, setInrQrExpiresAt] = useState<number | null>(null)
  const [inrSecondsRemaining, setInrSecondsRemaining] = useState(0)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [checkingFundedTier, setCheckingFundedTier] = useState(false)
  const [fundedTierEligibility, setFundedTierEligibility] = useState<boolean | null>(null)
  const [fundingMode, setFundingMode] = useState<"actual" | "funded">("actual")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; amount: number; transaction_id: string; payment_method: string; status: string; created_at: string; promo_code: string | null; promo_bonus_amount: number | null }>>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Fetch BEP20 address from DB when modal opens
  useEffect(() => {
    if (!isOpen) return
    setStep("form")
    setAmount(Number.isFinite(initialAmount) && initialAmount !== undefined && initialAmount >= 5 && initialAmount <= 100_000 ? String(initialAmount) : "")
    setTxHash("")
    setNote("")
    setPromoCode("")
    setAppliedPromo(null)
    setPromoMessage("")
    setApplyingPromo(false)
    setCopiedAddress(false)
    setErrorMessage("")
    setNetwork("ALL")
    setPaymentMethod("crypto")
    setInrQrDataUrl(null)
    setInrQrExpiresAt(null)
    setInrSecondsRemaining(0)
    setFundingMode("actual")
    setFundedTierEligibility(null)
    setPendingRequests([])
    const fetchPendingRequests = async () => {
      setLoadingRequests(true)
      try {
        const response = await participantFetch("/api/participant/topup/submit", { cache: "no-store" })
        if (response.status === 401) {
          clearParticipantAuth()
          window.location.assign("/participant/login?reason=session-expired")
          return
        }
        if (response.ok) {
          const data = await response.json()
          setPendingRequests(Array.isArray(data.requests) ? data.requests : [])
        }
      } catch {
        setPendingRequests([])
      } finally {
        setLoadingRequests(false)
      }
    }
    fetchPendingRequests()
    const fetchFundedTierEligibility = async () => {
      if (!isFundedAccount && !isInitialFundedTopUp) return
      setCheckingFundedTier(true)
      try {
        const response = await participantFetch("/api/participant/topup/availability", { cache: "no-store" })
        const data = await response.json()
        const available = response.ok && data.success && data.fundedTierAvailable === true
        if (response.status === 401) {
          clearParticipantAuth()
          window.location.assign("/participant/login?reason=session-expired")
          return
        }
        setFundedTierEligibility(available)
        if (available && (initialFundingMode === "funded" || (initialFundingMode !== "actual" && (openFundedTier || isInitialFundedTopUp)))) setFundingMode("funded")
      } catch {
        setFundedTierEligibility(false)
      } finally {
        setCheckingFundedTier(false)
      }
    }
    fetchFundedTierEligibility()
    const fetchAddress = async () => {
      setLoadingAddress(true)
      try {
        const res = await fetch("/api/public/settings")
        const data = await res.json()
        setWalletAddresses({ TRC20: data.trc20_address || null, BEP20: data.bep20_address || data.topup_address || null, ERC20: data.erc20_address || null })
        setInrDetails({ upiId: data.inr_upi_id || DEFAULT_INR_UPI_ID, bankName: data.inr_bank_name || null, accountNumber: data.inr_account_number || null, ifsc: data.inr_ifsc_code || null, holderName: data.inr_account_holder_name || null })
        setInrRate(Number(data.usdt_inr_rate) > 0 ? Number(data.usdt_inr_rate) : 104)
      } catch {
        setWalletAddresses({ TRC20: null, BEP20: null, ERC20: null })
      } finally {
        setLoadingAddress(false)
      }
    }
    fetchAddress()
  }, [isOpen, isFundedAccount, isInitialFundedTopUp, openFundedTier, initialAmount, initialFundingMode])

  const copyAddress = () => {
    const walletAddress = network === "TRC20" ? walletAddresses.TRC20 : network === "ERC20" ? walletAddresses.ERC20 : walletAddresses.BEP20
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const selectedWalletAddress = network === "TRC20" ? walletAddresses.TRC20 : network === "ERC20" ? walletAddresses.ERC20 : walletAddresses.BEP20

  useEffect(() => {
    if (paymentMethod !== "inr" || !inrDetails.upiId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setInrQrDataUrl(null)
      setInrQrExpiresAt(null)
      setInrSecondsRemaining(0)
      return
    }
    const expiresAt = Date.now() + 5 * 60 * 1000
    const rawAmount = Number(amount)
    const promoDiscountAmount = appliedPromo ? calculatePromoDiscount(rawAmount, appliedPromo, inrRate) : 0
    const discountedAmount = Number(Math.max(0, rawAmount - promoDiscountAmount).toFixed(2))
    const inrAmount = discountedAmount * inrRate
    setInrQrExpiresAt(expiresAt)
    setInrSecondsRemaining(5 * 60)
    QRCode.toDataURL(`upi://pay?pa=${encodeURIComponent(inrDetails.upiId)}&pn=${encodeURIComponent(inrDetails.holderName || "Elite Fund")}&am=${inrAmount.toFixed(2)}&cu=INR`, { width: 220, margin: 1 })
      .then(setInrQrDataUrl)
      .catch(() => setInrQrDataUrl(null))
  }, [paymentMethod, inrDetails.upiId, inrDetails.holderName, amount, appliedPromo, inrRate])

  useEffect(() => {
    if (!inrQrExpiresAt) return
    const updateCountdown = () => setInrSecondsRemaining(Math.max(0, Math.ceil((inrQrExpiresAt - Date.now()) / 1000)))
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [inrQrExpiresAt])

  const inrQrExpired = paymentMethod === "inr" && inrQrExpiresAt !== null && inrSecondsRemaining <= 0
  const inrCountdownLabel = `${String(Math.floor(inrSecondsRemaining / 60)).padStart(2, "0")}:${String(inrSecondsRemaining % 60).padStart(2, "0")}`

  // Generate a real, scannable QR code for the selected deposit address.
  useEffect(() => {
    if (!selectedWalletAddress) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    setQrLoading(true)
    QRCode.toDataURL(selectedWalletAddress, {
      width: 168,
      margin: 1,
      color: { dark: "#0f2438", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedWalletAddress])

  const parsedAmount = parseFloat(amount)
  const promoDiscountAmount = appliedPromo && Number.isFinite(parsedAmount) && parsedAmount > 0
    ? calculatePromoDiscount(parsedAmount, appliedPromo, inrRate)
    : 0
  const payableAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
    ? Number((parsedAmount - promoDiscountAmount).toFixed(2))
    : parsedAmount
  const fundedTiers: Record<number, number> = Object.fromEntries(FUNDED_PLANS.map((plan) => [plan.topUpAmount, plan.baseAmount]))
  // Keep the two funded-account choices visible even if the parent updates
  // the modal mode and open state in the same batched click event.
  const showFundingOptions = Boolean(isFundedAccount || isInitialFundedTopUp)
  const canUseFundedTier = fundedTierAvailable ?? fundedTierEligibility === true
  const isFundedAmountValid = !showFundingOptions || fundingMode !== "funded" || parsedAmount in fundedTiers
  const isPromoCompatible = !appliedPromo || appliedPromo.discountType !== "inr" || paymentMethod === "inr"
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount >= 5 && isFundedAmountValid && isPromoCompatible && (!appliedPromo || payableAmount >= 5)
  const expectedCreditAmount = fundingMode === "funded" && parsedAmount in fundedTiers
    ? fundedTiers[parsedAmount as keyof typeof fundedTiers]
    : parsedAmount

  const applyPromoCode = async () => {
    const normalizedCode = promoCode.trim().toUpperCase().replace(/\s+/g, "")
    setPromoMessage("")
    setAppliedPromo(null)
    if (!normalizedCode) {
      setPromoMessage("Enter a promo code first.")
      return
    }
    setApplyingPromo(true)
    try {
      const response = await participantFetch(`/api/participant/promo-codes?code=${encodeURIComponent(normalizedCode)}`, { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.message || "Promo code could not be applied.")
      const discountType = data.discountType as PromoDiscountType
      const discountValue = Number(data.discountValue)
      if (!["percent", "fiat", "inr"].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0) {
        throw new Error("This promo code has an invalid discount configuration.")
      }
      const promo = { code: String(data.code), discountType, discountValue }
      setPromoCode(promo.code)
      setAppliedPromo(promo)
      setPromoMessage(`${promo.code} applied — ${describePromoDiscount(promo)}`)
    } catch (error) {
      setPromoMessage(error instanceof Error ? error.message : "Promo code could not be applied.")
    } finally {
      setApplyingPromo(false)
    }
  }

  const handleSubmit = async () => {
    setErrorMessage("")

    if (fundingMode === "funded" && !canUseFundedTier) {
      setFundingMode("actual")
      setErrorMessage("Funded-tier funding is available only for your first funding request. Please use Normal Add Fund.")
      return
    }
    if (promoCode.trim() && !appliedPromo) {
      setErrorMessage("Apply the promo code before submitting payment.")
      return
    }
    if (!isPromoCompatible) {
      setErrorMessage("This INR promo code can only be used with UPI / bank transfer.")
      return
    }
    if (!isAmountValid) {
      setErrorMessage(fundingMode === "funded" && !isFundedAmountValid
        ? "The first funded top-up must be $50, $100, $250, $500, or $1,000"
        : appliedPromo && payableAmount < 5
          ? "The promo discount must leave at least $5 to send."
          : "Please enter a valid amount (minimum $5)")
      return
    }
    if (!txHash.trim()) {
      setErrorMessage("Please enter your transaction hash")
      return
    }
    setStep("submitting")

    try {
      const response = await participantFetch("/api/participant/topup/submit", {
        method: "POST",
        body: JSON.stringify({
          userId,
          userEmail: userEmail || userId,
          amount: parsedAmount,
          transactionHash: txHash.trim(),
          network,
          fundingMode: showFundingOptions && fundingMode === "funded" ? "funded" : "actual",
          promoCode: appliedPromo?.code || "",
          note: `[Payment method: ${network}]${appliedPromo ? ` [Promo code: ${appliedPromo.code}]` : ""}${note.trim() ? ` ${note.trim()}` : ""}`,
        }),
      })

      const data = await response.json().catch(() => ({ message: "The server returned an invalid response." }))

      if (response.status === 401) {
        clearParticipantAuth()
        window.location.assign("/participant/login?reason=session-expired")
        return
      }

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || data.error || "Submission failed. Please try again.")
        setStep("form")
        return
      }

      setStep("success")
      if (onSuccess) onSuccess(expectedCreditAmount)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please check your connection and try again.")
      setStep("form")
    }
  }

  const checkoutProgress = step === "success" ? 3 : isAmountValid && txHash.trim() ? 2 : isAmountValid ? 1 : 0

  const content = (
    <>
        <header className="funding-checkout-header">
          <div className="funding-checkout-heading">
            <p className="funding-kicker">EliteFund checkout</p>
            {presentation === "page" ? <h1>{step === "success" ? "Request submitted" : "Add funds"}</h1> : <DialogTitle>{step === "success" ? "Request submitted" : "Add funds"}</DialogTitle>}
            {presentation === "page" ? <p>{step === "success" ? "Your payment reference has been sent for review." : "Choose your amount, transfer your payment, and submit the reference."}</p> : <DialogDescription>{step === "success" ? "Your payment reference has been sent for review." : "Choose your amount, transfer your payment, and submit the reference."}</DialogDescription>}
          </div>
          {step !== "submitting" && <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={presentation === "page" ? "Back to dashboard" : "Close funding checkout"}>{presentation === "page" ? <ArrowLeft data-icon="inline-start" /> : <X data-icon="inline-start" />}</Button>}
        </header>
        <ol className="funding-progress" aria-label="Funding steps">
          {["Details", "Transfer", "Confirm"].map((label, index) => (
            <li key={label} data-active={checkoutProgress === index} data-complete={checkoutProgress > index} aria-current={checkoutProgress === index ? "step" : undefined}>
              <span className="funding-section-number" aria-hidden="true">{checkoutProgress > index ? <CheckCircle2 className="size-4" /> : index + 1}</span><span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="funding-checkout-scroll">
          {(step === "form" || step === "submitting") && (
            <div className="funding-checkout-grid">
              <div className="funding-checkout-main">
                <FundingSection number={1} title="Funding details" description="Choose your account option, payment method, and amount.">
                  <FieldGroup>

                    {showFundingOptions && (
                      <div className="funding-account-options">
                        <div className="funding-plan-heading"><p className="font-medium">Funded-tier Fund</p>{canUseFundedTier && isInitialFundedTopUp && <Badge variant="outline">First deposit only</Badge>}</div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{checkingFundedTier ? "Checking first-deposit eligibility..." : canUseFundedTier ? "Choose a plan to activate your funded account." : "Already used — only Normal Add Fund is available now."}</p>
                        {canUseFundedTier ? (
                          <ToggleGroup type="single" variant="outline" className="funding-choice-group funding-tier-group" aria-label="Funded account plan" value={fundingMode === "funded" ? String(Number(amount)) : ""} disabled={step === "submitting"}>
                            {[50, 100, 250, 500, 1000].map((tier) => <ToggleGroupItem key={tier} value={String(tier)} onClick={() => { setFundingMode("funded"); setPaymentMethod("inr"); setNetwork("INR"); setAmount(String(tier)) }}><strong>${tier.toLocaleString()} payment</strong><span>${(tier * 100).toLocaleString()} funded</span></ToggleGroupItem>)}
                          </ToggleGroup>
                        ) : <p className="text-sm text-muted-foreground">Already activated — available during first activation only.</p>}
                        <Button type="button" variant="outline" className="funding-normal-option" data-active={fundingMode === "actual"} aria-pressed={fundingMode === "actual"} onClick={() => { setFundingMode("actual"); setAmount("") }} disabled={step === "submitting"}>
                          <span><strong>Normal Add Fund</strong><small>Add your selected amount to your trading wallet.</small></span>{fundingMode === "actual" && <CheckCircle2 data-icon="inline-end" />}
                        </Button>
                        <Separator />
                      </div>
                    )}

                    <Field>
                      <FieldLabel>Payment method</FieldLabel>
                      <ToggleGroup type="single" variant="outline" className="funding-choice-group funding-method-group" aria-label="Payment method" value={paymentMethod} disabled={step === "submitting"}>
                        <ToggleGroupItem value="inr" onClick={() => { setPaymentMethod("inr"); setNetwork("INR") }}><Landmark data-icon="inline-start" /><span className="funding-method-copy"><strong>UPI / Bank transfer</strong><span>Pay in INR</span></span></ToggleGroupItem>
                        <ToggleGroupItem value="crypto" onClick={() => { setPaymentMethod("crypto"); setNetwork("ALL") }}><Wallet data-icon="inline-start" /><span className="funding-method-copy"><strong>USDT / Crypto</strong><span>Choose your network</span></span></ToggleGroupItem>
                      </ToggleGroup>
                      {paymentMethod === "inr" && <FieldDescription>Payouts are sent to the same account used to add funds.</FieldDescription>}
                    </Field>

                    <Field data-invalid={Boolean(amount && !isAmountValid)}>
                      <FieldLabel htmlFor="topup-amount">{paymentMethod === "inr" ? "Funding amount (USD) — QR in INR" : appliedPromo ? "Funding amount (USD)" : "Amount sent (USDT)"}<span aria-hidden="true">*</span></FieldLabel>
                      <InputGroup>
                        <InputGroupInput id="topup-amount" type="number" inputMode="decimal" min="5" max="100000" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="funding-amount-input" disabled={step === "submitting"} aria-required="true" aria-invalid={Boolean(amount && !isAmountValid)} aria-describedby={amount && !isAmountValid && isPromoCompatible ? "topup-amount-help topup-amount-error" : "topup-amount-help"} />
                        <InputGroupAddon align="inline-end">{paymentMethod === "inr" || appliedPromo ? "USD" : "USDT"}</InputGroupAddon>
                      </InputGroup>
                      <ToggleGroup type="single" variant="outline" className="funding-choice-group" value={String(Number(amount))} disabled={step === "submitting"} aria-label="Quick funding amounts">
                        {(fundingMode === "funded" ? [50, 100, 250, 500] : [25, 50, 100, 250]).map((quickAmount) => <ToggleGroupItem key={quickAmount} value={String(quickAmount)} onClick={() => setAmount(String(quickAmount))}>${quickAmount}</ToggleGroupItem>)}
                      </ToggleGroup>
                      <FieldDescription id="topup-amount-help">{paymentMethod === "inr" && Number.isFinite(payableAmount) && payableAmount > 0 ? `UPI payment: ₹${(payableAmount * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })} at ₹${inrRate} per $1.` : fundingMode === "funded" ? "Use one of the supported funded account tiers." : "Minimum funding amount: $5."}</FieldDescription>
                      {amount && !isAmountValid && isPromoCompatible && <FieldError id="topup-amount-error">{appliedPromo && payableAmount < 5 ? "The promo discount must leave at least $5 to send." : fundingMode === "funded" ? "Choose one funded amount: $50, $100, $250, $500, or $1,000" : "Minimum amount is $5"}</FieldError>}
                    </Field>

                    <Field data-invalid={Boolean(promoMessage && !appliedPromo) || !isPromoCompatible}>
                      <FieldLabel htmlFor="topup-promo-code">Promo code <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                      <InputGroup>
                        <InputGroupInput id="topup-promo-code" value={promoCode} onChange={(event) => { setPromoCode(event.target.value.toUpperCase()); setAppliedPromo(null); setPromoMessage("") }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); applyPromoCode() } }} placeholder="ENTER CODE" autoComplete="off" maxLength={32} disabled={step === "submitting" || applyingPromo} aria-invalid={Boolean(promoMessage && !appliedPromo) || !isPromoCompatible} aria-describedby="topup-promo-help topup-promo-feedback" />
                        <InputGroupAddon align="inline-end"><InputGroupButton type="button" onClick={applyPromoCode} disabled={step === "submitting" || applyingPromo || !promoCode.trim()} variant="secondary" size="sm" aria-label="Apply promo code">{applyingPromo ? <Loader2 data-icon="inline-start" className="animate-spin" /> : "Apply"}</InputGroupButton></InputGroupAddon>
                      </InputGroup>
                      <FieldDescription id="topup-promo-help">Lower your payment without reducing your requested funding.</FieldDescription>
                      <div id="topup-promo-feedback" aria-live="polite" className="flex flex-col gap-2">
                        {promoMessage && <p className={cn("funding-promo-message", appliedPromo ? "text-primary" : "funding-error")}>{promoMessage}</p>}
                        {appliedPromo && !isPromoCompatible && <FieldError>This INR discount requires UPI / bank transfer.</FieldError>}
                        {appliedPromo && appliedPromo.discountType === "inr" && Number.isFinite(parsedAmount) && parsedAmount > 0 && <p className="text-sm text-primary">Promo savings: ₹{(promoDiscountAmount * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>}
                      </div>
                    </Field>

                    {paymentMethod === "crypto" && (
                      <Field>
                        <FieldLabel htmlFor="topup-network">Deposit Network <span aria-hidden="true">*</span></FieldLabel>
                        <select id="topup-network" value={network} onChange={(event) => setNetwork(event.target.value as typeof network)} disabled={step === "submitting"} className="w-full border px-3" aria-required="true" aria-describedby="topup-network-help">
                          <option value="ALL">All networks</option>
                          <option value="TRC20">TRC20 (TRON)</option>
                          <option value="BEP20">BEP20 (BSC)</option>
                          <option value="ERC20">ERC20 (Ethereum)</option>
                        </select>
                        <FieldDescription id="topup-network-help">Select the USDT network used for your transfer.</FieldDescription>
                      </Field>
                    )}
                  </FieldGroup>
                </FundingSection>

                <FundingPaymentInstructions paymentMethod={paymentMethod} network={network} payableAmount={payableAmount} inrRate={inrRate} inrDetails={inrDetails} inrQrDataUrl={inrQrDataUrl} inrQrExpired={inrQrExpired} inrCountdownLabel={inrCountdownLabel} selectedWalletAddress={selectedWalletAddress} loadingAddress={loadingAddress} qrLoading={qrLoading} qrDataUrl={qrDataUrl} copiedAddress={copiedAddress} onCopyAddress={copyAddress} />


                <FundingSection number={3} title="Confirm your transfer" description="Already paid? Add your payment reference so the team can verify it.">
                  <FieldGroup>
                    <Field data-invalid={errorMessage === "Please enter your transaction hash" && !txHash.trim()}>
                      <FieldLabel htmlFor="topup-txhash">Transaction Hash / UPI Transaction ID <span aria-hidden="true">*</span></FieldLabel>
                      <Input id="topup-txhash" placeholder={paymentMethod === "inr" ? "Enter UPI transaction ID / UTR number" : "0x1234567890abcdef..."} value={txHash} onChange={(e) => setTxHash(e.target.value)} className="font-mono" disabled={step === "submitting"} aria-required="true" aria-invalid={errorMessage === "Please enter your transaction hash" && !txHash.trim()} aria-describedby="topup-reference-help" />
                      <FieldDescription id="topup-reference-help">{paymentMethod === "inr" ? "Find the UTR or transaction ID in your UPI or banking app." : "Copy the transaction hash from your completed USDT transfer."}</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="topup-note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                      <Input id="topup-note" placeholder="Additional info for admin..." value={note} onChange={(e) => setNote(e.target.value)} disabled={step === "submitting"} />
                    </Field>
                  </FieldGroup>
                </FundingSection>
              </div>
              <aside className="funding-checkout-aside" aria-label="Payment review">
                <FundingReviewSummary currentBalance={currentBalance} parsedAmount={parsedAmount} payableAmount={payableAmount} expectedCreditAmount={expectedCreditAmount} paymentMethod={paymentMethod} network={network} inrRate={inrRate} isFundedTier={fundingMode === "funded"} promoCode={appliedPromo?.code} promoDiscountAmount={promoDiscountAmount} />
                <PendingFundingRequests requests={pendingRequests} isLoading={loadingRequests} />
              </aside>
            </div>
          )}

          {step === "success" && (
            <div className="funding-success">
              <div className="funding-success-icon"><CheckCircle2 className="size-7" aria-hidden="true" /></div>
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-medium text-foreground">Request Submitted!</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">Your payment of <strong className="font-medium text-foreground">${payableAmount.toFixed(2)}{paymentMethod === "inr" ? " USD" : " USDT"}</strong> is pending review. If approved, <strong className="font-medium text-foreground">${expectedCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> will be credited to your account.</p>
              </div>
              <FundingReviewSummary currentBalance={currentBalance} parsedAmount={parsedAmount} payableAmount={payableAmount} expectedCreditAmount={expectedCreditAmount} paymentMethod={paymentMethod} network={network} inrRate={inrRate} isFundedTier={fundingMode === "funded"} promoCode={appliedPromo?.code} promoDiscountAmount={promoDiscountAmount} isSubmitted />
            </div>
          )}
        </div>
        <footer className="funding-checkout-footer">
          {errorMessage && <Alert variant="destructive" className="funding-error"><AlertCircle aria-hidden="true" /><AlertDescription>{errorMessage}</AlertDescription></Alert>}
          {step === "success" ? <Button type="button" onClick={onClose} className="funding-primary-action w-full">Done</Button> : (
            <div className="funding-checkout-actions">
              <div className="funding-footer-total"><p>Payment due</p><strong>{Number.isFinite(payableAmount) && payableAmount > 0 ? paymentMethod === "inr" ? `₹${(payableAmount * inrRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })} INR` : `$${payableAmount.toFixed(2)} USDT` : "—"}</strong></div>
              <Button type="button" onClick={handleSubmit} disabled={step === "submitting"} className="funding-primary-action h-12">
                {step === "submitting" ? <><Loader2 data-icon="inline-start" className="animate-spin" />Submitting...</> : <><Send data-icon="inline-start" />Submit Request</>}
              </Button>
            </div>
          )}
        </footer>
    </>
  )

  if (presentation === "page") return <main className="participant-funding-workspace funding-checkout-page font-sans">{content}</main>

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && step !== "submitting") onClose() }}>
      <DialogContent className="participant-funding-workspace funding-checkout-dialog font-sans" showCloseButton={false} style={{ background: "var(--profile-background)", color: "var(--profile-foreground)" }}>{content}</DialogContent>
    </Dialog>
  )
}
