"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Copy, Loader2, Smartphone, ShieldOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { participantFetch } from "@/lib/auth"

type Status = {
  enabled: boolean
  configured: boolean
}

export function GoogleAuthenticatorSetup() {
  const { toast } = useToast()
  const [status, setStatus] = useState<Status | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [isDisabling, setIsDisabling] = useState(false)
  const [showDisableForm, setShowDisableForm] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const response = await participantFetch("/api/participant/authenticator")
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || "Unable to load authenticator status")
      setStatus({ enabled: Boolean(body.enabled), configured: Boolean(body.configured) })
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load authenticator status")
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const startSetup = async () => {
    setIsStarting(true)
    try {
      const response = await participantFetch("/api/participant/authenticator", {
        method: "POST",
        body: JSON.stringify({ action: "setup" }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || "Failed to start setup")
      setQrCode(body.qrCode)
      setManualKey(body.manualKey)
      setCode("")
      toast({ title: "Scan the QR code", description: "Use Google Authenticator to scan the code below." })
    } catch (error) {
      toast({
        title: "Could not start setup",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" })
      return
    }
    setIsVerifying(true)
    try {
      const response = await participantFetch("/api/participant/authenticator", {
        method: "POST",
        body: JSON.stringify({ action: "enable", code }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || "Invalid code")
      setQrCode(null)
      setManualKey(null)
      setCode("")
      await loadStatus()
      toast({ title: "Google Authenticator enabled", description: "Your account now requires a 6-digit code at sign-in." })
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const disableAuthenticator = async () => {
    if (!/^\d{6}$/.test(disableCode)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" })
      return
    }
    setIsDisabling(true)
    try {
      const response = await participantFetch("/api/participant/authenticator", {
        method: "POST",
        body: JSON.stringify({ action: "disable", code: disableCode }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || "Invalid code")
      setDisableCode("")
      setShowDisableForm(false)
      await loadStatus()
      toast({ title: "Google Authenticator disabled" })
    } catch (error) {
      toast({
        title: "Could not disable",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDisabling(false)
    }
  }

  const copyManualKey = () => {
    if (!manualKey) return
    navigator.clipboard.writeText(manualKey)
    toast({ title: "Copied", description: "Setup key copied to clipboard." })
  }

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <Smartphone className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base text-slate-100">Google Authenticator</CardTitle>
            <p className="text-sm text-slate-500">Require a 6-digit app code every time you sign in.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loadError && <p className="text-sm text-red-300">{loadError}</p>}

        {!loadError && !status && <p className="text-sm text-slate-500">Loading authenticator status…</p>}

        {status?.enabled && !showDisableForm && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-sm font-medium text-emerald-200">Two-factor authentication is enabled</p>
                <p className="mt-1 text-xs text-emerald-300/80">
                  You&apos;ll be asked for a code from Google Authenticator each time you sign in.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-fit gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              onClick={() => setShowDisableForm(true)}
            >
              <ShieldOff className="size-4" />
              Disable authenticator
            </Button>
          </div>
        )}

        {status?.enabled && showDisableForm && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <Label htmlFor="disable-code" className="text-slate-200">
              Enter your 6-digit code to disable
            </Label>
            <div className="flex gap-2">
              <Input
                id="disable-code"
                inputMode="numeric"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="border-slate-700 bg-slate-950 text-center text-lg tracking-widest"
              />
              <Button
                variant="destructive"
                onClick={disableAuthenticator}
                disabled={isDisabling || disableCode.length !== 6}
              >
                {isDisabling ? <Loader2 className="size-4 animate-spin" /> : "Disable"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-slate-400"
              onClick={() => {
                setShowDisableForm(false)
                setDisableCode("")
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {status && !status.enabled && !qrCode && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-400">
              Protect your account by requiring a 6-digit code from the Google Authenticator app at every sign-in.
            </p>
            <Button onClick={startSetup} disabled={isStarting} className="w-fit gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              {isStarting ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              {isStarting ? "Generating…" : "Set up Google Authenticator"}
            </Button>
          </div>
        )}

        {status && !status.enabled && qrCode && (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-1 text-sm text-slate-400">
              <li>1. Open Google Authenticator and tap + to add an account.</li>
              <li>2. Scan the QR code below, or enter the key manually.</li>
              <li>3. Enter the 6-digit code it generates to confirm.</li>
            </ol>

            <div className="flex justify-center">
              <img
                src={qrCode || "/placeholder.svg"}
                alt="Scan this QR code with Google Authenticator"
                className="size-48 rounded-lg border border-slate-700 bg-white p-2"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-slate-300">Can&apos;t scan? Enter this key manually</Label>
              <div className="flex gap-2">
                <code className="flex-1 overflow-x-auto rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                  {manualKey}
                </code>
                <Button size="icon" variant="outline" className="shrink-0 border-slate-700" onClick={copyManualKey} aria-label="Copy setup key">
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="verify-code" className="text-slate-300">
                6-digit code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="border-slate-700 bg-slate-950 text-center text-lg tracking-widest"
                />
                <Button onClick={verifyAndEnable} disabled={isVerifying || code.length !== 6} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  {isVerifying ? <Loader2 className="size-4 animate-spin" /> : "Verify & enable"}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-slate-400"
              onClick={() => {
                setQrCode(null)
                setManualKey(null)
                setCode("")
              }}
            >
              Cancel setup
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
