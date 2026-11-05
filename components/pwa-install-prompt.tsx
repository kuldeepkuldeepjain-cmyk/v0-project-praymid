"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
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

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
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

  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  if (isStandalone || !ready) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Download aria-hidden="true" /></div>
          <DialogTitle>Download EliteFund</DialogTitle>
          <DialogDescription className="sr-only">Add EliteFund to your home screen.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {installEvent && <Button type="button" className="w-full" onClick={install} disabled={installing}><Download data-icon="inline-start" />{installing ? "Preparing…" : "Download app"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
