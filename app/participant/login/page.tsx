"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowRight, Clock, Loader2, Mail, Phone, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { setParticipantAuth } from "@/lib/auth"
import { ForgotPasswordModal } from "@/components/forgot-password-modal"
import { ParticipantAuthShell } from "@/components/participant-auth-shell"
import { ParticipantAuthPassword } from "@/components/participant-auth-password"

export default function ParticipantLoginPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [mobile_number, setMobileNumber] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [loginMode, setLoginMode] = useState<"email" | "mobile">("email")
  const [credentialMode, setCredentialMode] = useState<"password" | "pin">("password")
  const [error, setError] = useState("")

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError("")
    const identifier = loginMode === "email" ? email : mobile_number
    const credential = password
    if (!identifier || !credential || (credentialMode === "pin" && !/^\d{4,6}$/.test(credential))) {
      setError(credentialMode === "pin" ? "Enter your 4 to 6 digit login PIN." : "Enter your sign-in details to continue.")
      return
    }
    setLoading(true)
    try {
      const body = credentialMode === "pin" ? (loginMode === "email" ? { email, pin: credential } : { mobile_number, pin: credential }) : (loginMode === "email" ? { email, password } : { mobile_number, password })
      const response = await fetch(credentialMode === "pin" ? "/api/auth/participant-pin-login" : "/api/auth/participant-login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!data.success && data.pendingVerification) {
        setPendingVerification(true)
        return
      }
      if (data.success) {
        const participantData = {
          id: data.participantId, participantId: data.participantId, email: data.email,
          username: data.username, name: data.name, walletAddress: data.walletAddress,
          activation_fee_paid: data.activation_fee_paid, contribution_approved: data.contribution_approved,
          bep20_address: data.bep20_address, contributed_amount: data.contributed_amount || 0,
          wallet_balance: data.wallet_balance || 0, account_balance: data.account_balance || data.wallet_balance || 0,
          bonus_balance: data.bonus_balance || 0, participation_count: data.participation_count || 0,
          referral_count: data.referral_count || 0, referral_earnings: data.referral_earnings || data.bonus_balance || 0,
          referral_code: data.referral_code || "", activation_deadline: data.activation_deadline,
          created_at: data.created_at, is_frozen: data.is_frozen, total_earnings: data.total_earnings || 0,
          rank: data.rank || "bronze", is_active: data.is_active !== false, serial_number: data.serial_number || "",
          status: data.status || "active", pinConfigured: data.pinConfigured === true,
        }
        setParticipantAuth(
          data.participantId || `user-${Date.now()}`, data.walletAddress || data.bep20_address || "",
          data.email, data.username, data.name || data.full_name, data.activation_fee_paid || false,
          data.created_at, data.is_frozen || false,
        )
        localStorage.setItem("participantData", JSON.stringify(participantData))
        toast({ title: "Welcome back!", description: "Successfully signed in." })
        window.location.href = "/participant/dashboard"
      } else {
        setError("We couldn’t sign you in. Check your details and try again.")
      }
    } catch {
      setError("Unable to connect. Check your internet connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ParticipantAuthShell mode="login">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">WELCOME BACK</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">Sign in to EliteFund</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">Your trading workspace is ready. Let&apos;s pick up where you left off.</p>
      </div>
      {pendingVerification ? (
        <div className="flex flex-col gap-4">
          <Alert><Clock aria-hidden="true" /><AlertTitle>Verification pending</AlertTitle><AlertDescription>Your mobile number is awaiting admin verification. You can sign in once it has been verified.</AlertDescription></Alert>
          <Button variant="outline" className="auth-submit" onClick={() => setPendingVerification(false)}>Try signing in again</Button>
        </div>
      ) : (
        <form onSubmit={handleLogin} aria-busy={loading} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel id="login-method-label">Sign in with</FieldLabel>
              <ToggleGroup type="single" aria-labelledby="login-method-label" value={loginMode} disabled={loading} onValueChange={(mode) => { if (mode === "email" || mode === "mobile") { setLoginMode(mode); setError("") } }}>
                <ToggleGroupItem value="email"><Mail aria-hidden="true" />Email</ToggleGroupItem>
                <ToggleGroupItem value="mobile"><Phone aria-hidden="true" />Mobile</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="identifier">{loginMode === "email" ? "Email address" : "Mobile number"}</FieldLabel>
              <InputGroup className="min-w-0">
                <InputGroupInput key={loginMode} id="identifier" name={loginMode === "email" ? "email" : "mobile_number"} type={loginMode === "email" ? "email" : "tel"} inputMode={loginMode === "email" ? "email" : "tel"} autoComplete={loginMode === "email" ? "email" : "tel"} autoCapitalize="none" spellCheck={false} placeholder={loginMode === "email" ? "you@example.com" : "Include your country code"} value={loginMode === "email" ? email : mobile_number} onChange={(event) => loginMode === "email" ? setEmail(event.target.value) : setMobileNumber(event.target.value.replace(/[^0-9+()\s-]/g, ""))} disabled={loading} required />
                <InputGroupAddon>{loginMode === "email" ? <Mail aria-hidden="true" /> : <Phone aria-hidden="true" />}</InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <FieldLabel htmlFor="password">{credentialMode === "pin" ? "Login PIN" : "Password"}</FieldLabel>
                <button type="button" disabled={loading} className="min-h-11 text-sm font-medium text-primary hover:underline" onClick={() => { setCredentialMode(credentialMode === "pin" ? "password" : "pin"); setPassword(""); setError("") }}>
                  {credentialMode === "pin" ? "Use password" : "Use PIN instead"}
                </button>
              </div>
              {credentialMode === "pin" ? (
                <InputGroup className="min-w-0"><InputGroupInput id="password" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} autoComplete="off" placeholder="Enter your 4–6 digit PIN" value={password} onChange={(event) => setPassword(event.target.value.replace(/\D/g, ""))} disabled={loading} required /><InputGroupAddon><LockKeyhole aria-hidden="true" /></InputGroupAddon></InputGroup>
              ) : <ParticipantAuthPassword id="password" name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} required />}
              {credentialMode === "pin" ? <FieldDescription>Use the login PIN you set up in your account.</FieldDescription> : <button type="button" onClick={() => setForgotPasswordOpen(true)} className="min-h-11 w-fit text-left text-sm text-primary hover:underline">Forgot password?</button>}
            </Field>
          </FieldGroup>
          {error && <Alert variant="destructive"><AlertTitle>Unable to sign in</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" disabled={loading} className="auth-submit">{loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}{loading ? "Signing in…" : "Sign in"}{!loading && <ArrowRight data-icon="inline-end" />}</Button>
        </form>
      )}
      <p className="text-center text-sm leading-relaxed text-muted-foreground">New to EliteFund? <Link href="/participant/register" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">Create an account</Link></p>
      <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </ParticipantAuthShell>
  )
}
