"use client"

import { useEffect, useState } from "react"
import { Download, Share2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "elitefund-install-prompt-dismissed"

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setReady(true)
      if (sessionStorage.getItem(DISMISSED_KEY) !== "true") {
        window.setTimeout(() => { setReady(true); setOpen(true) }, 900)
      }
    }
    const handleAppInstalled = () => {
      setInstallEvent(null)
      setOpen(false)
    }

    const promptTimer = window.setTimeout(() => {
      if (sessionStorage.getItem(DISMISSED_KEY) !== "true") { setReady(true); setOpen(true) }
    }, 900)
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.clearTimeout(promptTimer)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true")
    setOpen(false)
  }

  const install = async () => {
    if (!installEvent) return
    setInstalling(true)
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === "accepted") setInstallEvent(null)
    setInstalling(false)
    setOpen(false)
  }

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  if (isStandalone || !ready) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Download aria-hidden="true" /></div>
          <DialogTitle>Download the EliteFund app</DialogTitle>
          <DialogDescription>Add an EliteFund shortcut to your home screen for one-tap access. No separate app store download is required.</DialogDescription>
        </DialogHeader>
        {isIos ? (
          <p className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6 text-foreground"><Share2 className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />On your phone, tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>. This creates the EliteFund browser shortcut.</p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">This adds an EliteFund browser shortcut to your home screen or desktop. {installEvent ? "Select Download app below to continue." : "On mobile, use your browser menu and choose Add to home screen."}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={dismiss}><X data-icon="inline-start" />Not now</Button>
          {installEvent && <Button type="button" onClick={install} disabled={installing}>{installing ? "Preparing…" : "Download app"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
