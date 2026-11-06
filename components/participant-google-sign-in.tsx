"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import Script from "next/script"
import useSWR from "swr"
import { cn } from "@/lib/utils"

interface GoogleIdentity {
  initialize: (options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean; context: string; ux_mode: string; use_fedcm_for_button: boolean }) => void
  renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number }) => void
  prompt: () => void
  cancel: () => void
}

function identity() {
  return (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id
}

async function loadConfiguration(url: string): Promise<{ clientId: string; nonce: string }> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Google sign-in is temporarily unavailable. Use email or mobile instead.")
  return response.json()
}

export function ParticipantGoogleSignIn({ disabled, onCredential, mode = "signin" }: { disabled: boolean; onCredential: (credential: string) => Promise<void>; mode?: "signin" | "signup" }) {
  const button = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const [scriptReady, setScriptReady] = useState(false)
  const [scriptError, setScriptError] = useState(false)
  const { data, error } = useSWR("/api/auth/participant-google-one-tap", loadConfiguration, {
    revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false,
  })
  const receiveCredential = useEffectEvent(async (credential: string) => {
    if (disabled || inFlight.current) return
    inFlight.current = true
    try { await onCredential(credential) } finally { inFlight.current = false }
  })

  useEffect(() => {
    const google = identity()
    if (!scriptReady || !data || !button.current || !google) return
    google.initialize({
      client_id: data.clientId, nonce: data.nonce, auto_select: false,
      context: mode, ux_mode: "popup", use_fedcm_for_button: true,
      callback: ({ credential }) => { void receiveCredential(credential) },
    })
    google.renderButton(button.current, { theme: mode === "signin" ? "filled_blue" : "outline", size: "large", text: "continue_with", shape: mode === "signin" ? "pill" : "rectangular", width: Math.min(400, button.current.clientWidth) })
    // Embedded previews cannot reliably grant FedCM permissions or retain auth cookies.
    if (window.self === window.top) google.prompt()
    return () => google.cancel()
  }, [scriptReady, data, mode])

  useEffect(() => {
    if (disabled) identity()?.cancel()
  }, [disabled])

  return (
    <section
      aria-label={mode === "signup" ? "Register with Google" : "Google sign-in"}
      className={cn(
        "flex flex-col gap-3",
        mode === "signin" && "rounded-2xl border border-primary/25 bg-primary/5 p-3 shadow-sm transition-colors duration-200 hover:border-primary/45 hover:bg-primary/10 sm:p-4",
      )}
    >
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setScriptError(true)} />
      <div ref={button} inert={disabled} aria-busy={disabled} className="flex min-h-11 w-full justify-center" />
      {(error || scriptError) ? <p role="status" className="text-center text-sm text-muted-foreground">Google sign-in is temporarily unavailable. Use email or mobile instead.</p> : (
        <p className="text-center text-sm text-muted-foreground">{disabled ? "Signing in…" : !data || !scriptReady ? "Loading Google sign-in…" : mode === "signup" ? "Register with Google. No password or email code required." : "Use the Google email registered with your account."}</p>
      )}
      <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>{mode === "signup" ? "or register with email" : "or sign in below"}</span><span className="h-px flex-1 bg-border" /></div>
    </section>
  )
}
