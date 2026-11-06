"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { setParticipantAuth } from "@/lib/auth"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"
import { ParticipantAuthShell } from "@/components/participant-auth-shell"
import { ParticipantGoogleSignIn } from "@/components/participant-google-sign-in"
import { ParticipantRegistrationForm, REGISTRATION_COUNTRIES, type RegistrationData } from "@/components/participant-registration-form"

export default function ParticipantRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [googleIdentity, setGoogleIdentity] = useState<{ credential: string; email: string } | null>(null)
  const [emailVerification, setEmailVerification] = useState<{ email: string; code: string } | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [captcha, setCaptcha] = useState({ text: "", answer: "" })
  const [captchaInput, setCaptchaInput] = useState("")
  const [error, setError] = useState("")
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const referralCodeFromUrl = searchParams.get("ref")?.toUpperCase() || ""
  const requestedAccountType = searchParams.get("account")
  const initialAccountType: RegistrationData["accountType"] = requestedAccountType === "funded" || requestedAccountType === "challenge" ? requestedAccountType : "normal"
  const requestedPlan = searchParams.get("plan")
  const initialChallengePlan = DEFAULT_CHALLENGE_PLANS.find((plan) => plan.key === requestedPlan)?.key ?? DEFAULT_CHALLENGE_PLANS[0].key
  const defaultCountry = REGISTRATION_COUNTRIES[0]
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: "", lastName: "", email: "", countryCode: defaultCountry.code,
    mobileNumber: "", password: "", confirmPassword: "", country: defaultCountry.name,
    referralCode: referralCodeFromUrl, accountType: initialAccountType, challengePlanKey: initialChallengePlan,
  })

  const generateCaptcha = () => {
    // Excluding similar looking characters like I, O, 0, 1.
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let index = 0; index < 6; index++) code += characters.charAt(Math.floor(Math.random() * characters.length))
    setCaptcha({ text: code, answer: code })
    setCaptchaInput("")
  }
  useEffect(() => {
    if (referralCodeFromUrl) toast({ title: "Referral code applied", description: `Your referral code ${referralCodeFromUrl} has been added.` })
  }, [referralCodeFromUrl, toast])
  useEffect(() => {
    if (error) {
      errorSummaryRef.current?.focus()
      errorSummaryRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [error])

  const handleChange = (field: string, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }))
    setError("")
  }
  const handleCountryChange = (countryName: string) => {
    const country = REGISTRATION_COUNTRIES.find((item) => item.name === countryName)
    if (country) setFormData((previous) => ({ ...previous, country: countryName, countryCode: country.code }))
  }
  const googleSignIn = async (credential: string, complete = false) => {
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/participant-google-one-tap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, intent: complete ? "register-complete" : "register",
          ...(complete ? { registration: { ...formData, mobileNumber: formData.mobileNumber.replace(/\D/g, ""), acceptedTerms } } : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Google registration failed. Please try again.")
      if (data.requiresRegistration) {
        setGoogleIdentity({ credential, email: data.email })
        setFormData((previous) => ({ ...previous, email: data.email,
          firstName: data.firstName || previous.firstName, lastName: data.lastName || previous.lastName,
        }))
        toast({ title: "Google email verified", description: "Complete your account details and accept the terms. No password or email code is needed." })
        return
      }
      const walletAddress = data.walletAddress || data.bep20_address || ""
      const participantName = data.name || data.full_name || `${formData.firstName} ${formData.lastName}`.trim()
      setParticipantAuth(data.participantId, walletAddress, data.email, data.username,
        participantName, data.activation_fee_paid || false, data.created_at, data.is_frozen || false)
      localStorage.setItem("participantData", JSON.stringify({
        id: data.participantId, participantId: data.participantId, email: data.email,
        username: data.username || data.email, name: participantName,
        wallet: walletAddress, walletAddress, wallet_address: walletAddress,
        bep20_address: data.bep20_address || walletAddress,
        account_type: data.account_type || "normal",
        account_balance: Number(data.account_balance) || 0,
        wallet_balance: Number(data.wallet_balance ?? data.account_balance) || 0,
        bonus_balance: Number(data.bonus_balance) || 0,
        activation_fee_paid: data.activation_fee_paid === true,
        contribution_approved: data.contribution_approved === true,
        created_at: data.created_at || new Date().toISOString(),
        is_frozen: data.is_frozen === true, account_frozen: data.account_frozen === true,
        details_completed: data.details_completed === true, status: data.status || "active",
        is_active: data.is_active !== false, pinConfigured: data.pinConfigured === true,
        referral_code: data.referral_code || "", referred_by: data.referred_by || "",
        total_referrals: Number(data.total_referrals) || 0,
        total_earnings: Number(data.total_earnings) || 0,
        referral_earnings: Number(data.referral_earnings) || 0,
        rank: data.rank || "bronze", serial_number: data.serial_number || "",
        funded_amount: Number(data.funded_amount) || 0,
        funded_initial_balance: Number(data.funded_initial_balance) || 0,
        funded_breach_status: data.funded_breach_status || "clear",
      }))
      toast({ title: data.registered ? "Account created" : "Welcome back", description: "Signed in with Google." })
      window.location.assign("/participant/dashboard")
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Unable to connect. Please try again.")
    } finally { setLoading(false) }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError("")
    const normalizedEmail = formData.email.trim().toLowerCase()
    const mobileDigits = formData.mobileNumber.replace(/\D/g, "")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) { setError("Enter a valid email address such as name@example.com."); return }
    if (!(formData.country === "India" ? /^[6-9]\d{9}$/.test(mobileDigits) : /^\d{6,15}$/.test(mobileDigits))) { setError(formData.country === "India" ? "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9." : "Enter a valid mobile number for your country."); return }
    if (!acceptedTerms) { setError("Accept the Terms and Conditions to create your account."); return }
    if (!googleIdentity && (!captcha.answer || captchaInput.toUpperCase() !== captcha.answer)) { setError("The security code didn’t match. Enter the new code and try again."); generateCaptcha(); return }
    if (googleIdentity) { await googleSignIn(googleIdentity.credential, true); return }
    if (formData.password !== formData.confirmPassword) { setError("Your passwords don’t match. Re-enter them and try again."); return }
    if (formData.password.length < 6) { setError("Your password must be at least 6 characters."); return }
    setLoading(true)
    try {
      const response = await fetch("/api/participant/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName, lastName: formData.lastName,
          email: normalizedEmail, mobileNumber: formData.mobileNumber, countryCode: formData.countryCode,
          password: formData.password, country: formData.country,
          referralCode: formData.referralCode, accountType: formData.accountType, challengePlanKey: formData.challengePlanKey,
        }),
      })
      const data = await response.json().catch(() => ({ success: false, message: "We couldn’t complete registration right now. Please try again." }))
      if (data.success) {
        if (data.requiresEmailVerification) {
          setEmailVerification({ email: data.email || formData.email, code: "" })
          toast({ title: "Check your email", description: formData.accountType === "challenge" ? "Verify your email, then sign in to submit your Challenge fee and start the evaluation." : "Enter the 6-digit code we sent to verify your account." })
          return
        }
        // Set sessionStorage auth so isParticipantAuthenticated() returns true
        const token = data.participantId || `preview-${Date.now()}`
        setParticipantAuth(token, data.walletAddress || "", data.email || normalizedEmail, data.username || normalizedEmail, data.full_name || `${formData.firstName} ${formData.lastName}`, false, data.created_at || new Date().toISOString(), false)
        // Also persist extended data to localStorage for dashboard
        localStorage.setItem("participantData", JSON.stringify({
          id: data.participantId, email: data.email || normalizedEmail, username: data.username || normalizedEmail,
          wallet_address: data.walletAddress || "", referral_code: data.referralCode || "", account_balance: 0,
          bonus_balance: 0, total_earnings: 0, total_referrals: 0, status: "active", rank: "bronze", is_active: true,
          created_at: data.created_at || new Date().toISOString(),
        }))
        localStorage.setItem("participantNewAccountTopUpPending", String(data.participantId))
        toast({ title: "Account created!", description: `Welcome, ${formData.firstName.trim()}! Redirecting to your dashboard…` })
        // Redirect to dashboard after short delay to show success message
        setTimeout(() => { router.push("/participant/dashboard") }, 1500)
      } else setError(data.message || "Unable to complete registration. Please try again.")
    } catch {
      setError("Unable to connect. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const verifyEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!emailVerification || !/^\d{6}$/.test(emailVerification.code) || loading) return
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/participant/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailVerification.email, code: emailVerification.code }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Verification failed. Check your code and try again.")
      toast({ title: "Email verified", description: "Your account is ready. Please sign in." })
      router.push("/participant/login")
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Please try again.")
    } finally { setLoading(false) }
  }

  return (
    <ParticipantAuthShell mode="register">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">{emailVerification ? "ONE LAST STEP" : "GET STARTED"}</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">{emailVerification ? "Check your inbox" : "Create your account"}</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{emailVerification ? "Verify your email to finish setting up your account." : "A few details. One focused trading workspace."}</p>
      </div>
      {!emailVerification && !googleIdentity && <ParticipantGoogleSignIn mode="signup" disabled={loading} onCredential={googleSignIn} />}
      {googleIdentity && <Alert><AlertTitle>Google email verified</AlertTitle><AlertDescription>Complete your details for {googleIdentity.email}. No password or email code is required.<Button type="button" variant="link" disabled={loading} onClick={() => { setGoogleIdentity(null); setError("") }}>Use a different account</Button></AlertDescription></Alert>}
      {error && <div ref={errorSummaryRef} tabIndex={-1} className="outline-none"><Alert variant="destructive"><AlertTitle>{emailVerification ? "Unable to verify email" : "Please check your details"}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>}
      {emailVerification ? (
        <form onSubmit={verifyEmail} aria-busy={loading} className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"><Mail className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" /><p className="min-w-0 break-words text-sm leading-relaxed text-muted-foreground">We sent a 6-digit code to <strong className="font-medium text-foreground">{emailVerification.email}</strong>. Check your spam folder too.</p></div>
          <FieldGroup><Field><FieldLabel htmlFor="verification-code">Email verification code</FieldLabel><Input id="verification-code" name="code" autoFocus inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" minLength={6} maxLength={6} value={emailVerification.code} onChange={(event) => setEmailVerification({ ...emailVerification, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit code" disabled={loading} required /><FieldDescription>Your account will be ready once your email is verified.</FieldDescription></Field></FieldGroup>
          <Button type="submit" disabled={loading || emailVerification.code.length !== 6} className="auth-submit">{loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}{loading ? "Verifying…" : "Verify email"}{!loading && <ArrowRight data-icon="inline-end" />}</Button>
          <Button type="button" variant="ghost" className="min-h-11" disabled={loading} onClick={() => { setEmailVerification(null); setError("") }}>Back to registration</Button>
        </form>
      ) : <ParticipantRegistrationForm key={googleIdentity ? "google-registration" : "email-registration"} googleVerified={Boolean(googleIdentity)} initialStep={googleIdentity && formData.firstName.trim() && formData.lastName.trim() ? 1 : 0} formData={formData} onChange={handleChange} onCountryChange={handleCountryChange} onSubmit={handleSubmit} loading={loading} acceptedTerms={acceptedTerms} onAcceptTerms={setAcceptedTerms} captcha={captcha.text} captchaInput={captchaInput} onCaptchaInput={setCaptchaInput} onRefreshCaptcha={generateCaptcha} />}
      <p className="text-center text-sm leading-relaxed text-muted-foreground">Already have an account? <Link href="/participant/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">Sign in</Link></p>
    </ParticipantAuthShell>
  )
}
