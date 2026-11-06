"use client"

import { useRef, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ParticipantAuthPassword } from "@/components/participant-auth-password"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

export const REGISTRATION_COUNTRIES = [
  { name: "India", code: "+91" }, { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" }, { name: "Canada", code: "+1" },
  { name: "Australia", code: "+61" }, { name: "Germany", code: "+49" },
  { name: "France", code: "+33" }, { name: "China", code: "+86" },
  { name: "Japan", code: "+81" }, { name: "South Korea", code: "+82" },
  { name: "Singapore", code: "+65" }, { name: "Malaysia", code: "+60" },
  { name: "Indonesia", code: "+62" }, { name: "Thailand", code: "+66" },
  { name: "Vietnam", code: "+84" }, { name: "Philippines", code: "+63" },
  { name: "UAE", code: "+971" }, { name: "Saudi Arabia", code: "+966" },
  { name: "Pakistan", code: "+92" }, { name: "Bangladesh", code: "+880" },
  { name: "Nigeria", code: "+234" }, { name: "South Africa", code: "+27" },
  { name: "Brazil", code: "+55" }, { name: "Mexico", code: "+52" },
]

export interface RegistrationData {
  firstName: string; lastName: string; email: string;
  countryCode: string; mobileNumber: string; password: string; confirmPassword: string;
  country: string; referralCode: string;
  accountType: "normal" | "funded" | "challenge"; challengePlanKey: string;
}

interface RegistrationFormProps {
  googleVerified?: boolean
  initialStep?: number
  formData: RegistrationData
  onChange: (field: string, value: string) => void
  onCountryChange: (country: string) => void
  onSubmit: (event: FormEvent) => void
  loading: boolean
  acceptedTerms: boolean
  onAcceptTerms: (accepted: boolean) => void
  captcha: string
  captchaInput: string
  onCaptchaInput: (value: string) => void
  onRefreshCaptcha: () => void
}

const STEP_NAMES = ["Details", "Account", "Security"]

export function ParticipantRegistrationForm({ googleVerified = false, initialStep = 0, formData, onChange, onCountryChange, onSubmit, loading, acceptedTerms, onAcceptTerms, captcha, captchaInput, onCaptchaInput, onRefreshCaptcha }: RegistrationFormProps) {
  const [step, setStep] = useState(initialStep)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const plan = DEFAULT_CHALLENGE_PLANS.find((item) => item.key === formData.challengePlanKey) || DEFAULT_CHALLENGE_PLANS[0]
  const stepNames = googleVerified ? ["Details", "Account", "Finish"] : STEP_NAMES
  const passwordMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword

  const goToStep = (next: number) => {
    if (next === 2 && !googleVerified && !captcha) onRefreshCaptcha()
    setStep(next)
    requestAnimationFrame(() => { titleRef.current?.focus(); titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" }) })
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (step < 2) { event.preventDefault(); goToStep(step + 1); return }
    onSubmit(event)
  }

  return (
    <>
      <ol aria-label="Registration progress" className="flex items-center justify-between gap-2">
        {stepNames.map((label, index) => <li key={label} className="auth-step" aria-current={step === index ? "step" : undefined}><span className="auth-step-dot">{index < step ? <Check className="size-3.5" aria-label="Completed" /> : index + 1}</span><span>{label}</span></li>)}
      </ol>
      <div className="flex flex-col gap-1">
        <h2 ref={titleRef} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">{step === 2 && googleVerified ? "Finish your registration" : ["Let’s start with you", "Set up your account", "Secure your account"][step]}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{["Enter your details as you’d like them on your account.", "Choose an account type and add your contact details.", googleVerified ? "Your Google email is verified. Accept the terms to finish creating your account." : "Create a password, then verify your email after signing up."][step]}</p>
      </div>
      <form onSubmit={submit} aria-busy={loading} className="flex flex-col gap-6">
        <fieldset disabled={loading} className="min-w-0 border-0 p-0">
          <legend className="sr-only">{stepNames[step]}</legend>
          <FieldGroup>
            {step === 0 && <>
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
              <Field><FieldLabel htmlFor="firstName">First name</FieldLabel><Input id="firstName" name="firstName" autoComplete="given-name" placeholder="First name" value={formData.firstName} onChange={(event) => onChange("firstName", event.target.value.replace(/[^\p{L}\p{M}\s'-]/gu, ""))} required /></Field>
              <Field><FieldLabel htmlFor="lastName">Last name</FieldLabel><Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Last name" value={formData.lastName} onChange={(event) => onChange("lastName", event.target.value.replace(/[^\p{L}\p{M}\s'-]/gu, ""))} required /></Field>
              </FieldGroup>
              <Field><FieldLabel htmlFor="email">Email address</FieldLabel><Input id="email" name="email" type="email" readOnly={googleVerified} inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={formData.email} onChange={(event) => onChange("email", event.target.value)} aria-describedby="email-help" required /><FieldDescription id="email-help">{googleVerified ? "Verified by Google. This email is also your username." : "Your email is also your username. We’ll send your verification code here."}</FieldDescription></Field>
            </>}
            {step === 1 && <>
              <Field><FieldLabel id="account-type-label">Account type</FieldLabel><ToggleGroup type="single" aria-labelledby="account-type-label" value={formData.accountType} onValueChange={(value) => { if (value) onChange("accountType", value) }}><ToggleGroupItem value="normal">Normal</ToggleGroupItem><ToggleGroupItem value="funded">Funded</ToggleGroupItem><ToggleGroupItem value="challenge">Challenge</ToggleGroupItem></ToggleGroup><FieldDescription>{formData.accountType === "normal" ? "A standard platform account." : formData.accountType === "funded" ? "An account for funded trading." : "A rules-based trading evaluation with a virtual balance."}</FieldDescription></Field>
              {formData.accountType === "challenge" && <Field><FieldLabel htmlFor="challengePlan">Challenge plan</FieldLabel><select id="challengePlan" className="auth-country-select" value={formData.challengePlanKey} onChange={(event) => onChange("challengePlanKey", event.target.value)}>{DEFAULT_CHALLENGE_PLANS.map((item) => <option key={item.key} value={item.key}>{item.name} · ${item.fee} fee</option>)}</select><FieldDescription>${plan.startingBalance.toLocaleString()} virtual balance · {plan.profitTargetPercent}% target · {plan.dailyLossLimitPercent}% daily loss cap · {plan.maxDrawdownPercent}% maximum drawdown · {plan.minimumTradingDays} minimum trading days · up to {plan.leverage}:1 leverage. Pay the ${plan.fee} fee after email verification.</FieldDescription></Field>}
              <Field><FieldLabel htmlFor="country">Country</FieldLabel><select id="country" name="country" autoComplete="country-name" className="auth-country-select" value={formData.country} onChange={(event) => onCountryChange(event.target.value)}>{REGISTRATION_COUNTRIES.map((country) => <option key={country.name} value={country.name}>{country.name} ({country.code})</option>)}</select></Field>
              <Field><FieldLabel htmlFor="mobileNumber">Mobile number</FieldLabel><div className="flex items-center gap-2"><span className="flex h-12 shrink-0 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground" aria-label="Country calling code">{formData.countryCode}</span><Input id="mobileNumber" name="tel" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Mobile number" value={formData.mobileNumber} onChange={(event) => onChange("mobileNumber", event.target.value.replace(/\D/g, "").slice(0, formData.country === "India" ? 10 : 15))} maxLength={formData.country === "India" ? 10 : 15} pattern={formData.country === "India" ? "[6-9][0-9]{9}" : "[0-9]{6,15}"} aria-describedby="mobile-help" required /></div><FieldDescription id="mobile-help">{formData.country === "India" ? "10 digits, starting with 6, 7, 8, or 9." : "Enter 6–15 digits without the country code."}</FieldDescription></Field>
              <Field><FieldLabel htmlFor="referralCode">Referral code <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Input id="referralCode" placeholder="Have a referral code?" maxLength={10} autoCapitalize="characters" value={formData.referralCode} onChange={(event) => onChange("referralCode", event.target.value.toUpperCase())} /></Field>
            </>}
            {step === 2 && <>
              {!googleVerified && <>
              <Field><FieldLabel htmlFor="password">Password</FieldLabel><ParticipantAuthPassword id="password" name="password" autoComplete="new-password" minLength={6} placeholder="Create a password" value={formData.password} onChange={(event) => onChange("password", event.target.value)} aria-describedby="password-help" required /><FieldDescription id="password-help">At least 6 characters. A longer, unique password is recommended.</FieldDescription></Field>
              <Field data-invalid={passwordMismatch || undefined}><FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel><ParticipantAuthPassword id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={6} placeholder="Re-enter your password" value={formData.confirmPassword} onChange={(event) => onChange("confirmPassword", event.target.value)} aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? "password-match-help" : undefined} required />{passwordMismatch && <FieldDescription id="password-match-help">Your passwords don&apos;t match yet.</FieldDescription>}</Field>
              </>}
              {!googleVerified && <Field><FieldLabel htmlFor="captcha">Security check</FieldLabel><div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"><span className="font-mono text-xl font-medium tracking-widest text-primary" aria-label={`Security code: ${captcha}`}>{captcha || "······"}</span><Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onRefreshCaptcha} aria-label="Get a new security code"><RefreshCcw /></Button></div><Input id="captcha" name="captcha" placeholder="Enter the code above" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6} value={captchaInput} onChange={(event) => onCaptchaInput(event.target.value.toUpperCase())} aria-describedby="captcha-help" required /><FieldDescription id="captcha-help">Enter the 6-character code. You can refresh it if needed.</FieldDescription></Field>}
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted-foreground"><input type="checkbox" name="terms" checked={acceptedTerms} onChange={(event) => onAcceptTerms(event.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" required /><span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Terms and Conditions</a> and acknowledge the applicable risk disclosures.</span></label>
            </>}
          </FieldGroup>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Button type="submit" className="auth-submit" disabled={loading || (step === 2 && (!acceptedTerms || (!googleVerified && !captcha)))}>{loading && <Loader2 data-icon="inline-start" className="animate-spin" />}{loading ? "Creating account…" : step === 2 ? "Create account" : "Continue"}{!loading && <ArrowRight data-icon="inline-end" />}</Button>
          {step > 0 && <Button type="button" variant="ghost" className="min-h-11" disabled={loading} onClick={() => goToStep(step - 1)}><ArrowLeft data-icon="inline-start" />Back</Button>}
        </div>
      </form>
    </>
  )
}
