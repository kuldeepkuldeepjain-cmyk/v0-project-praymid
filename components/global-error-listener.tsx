"use client"

import { useEffect, useRef } from "react"
import * as Sentry from "@sentry/nextjs"
import { toast } from "@/hooks/use-toast"

/**
 * Mounted once in the root layout. Catches JS errors and promise rejections that
 * happen outside React's render cycle (event handlers, timers, fetch calls, etc.)
 * so the user always sees a message instead of a silent failure, and every
 * uncaught error is reported to Sentry.
 */
export function GlobalErrorListener() {
  const lastShownAt = useRef(0)

  useEffect(() => {
    const notify = (message: string) => {
      // Avoid flooding the user with toasts if multiple errors fire in a burst.
      const now = Date.now()
      if (now - lastShownAt.current < 4000) return
      lastShownAt.current = now

      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: message,
      })
    }

    const handleError = (event: ErrorEvent) => {
      console.error("[v0] Uncaught error:", event.error ?? event.message)
      Sentry.captureException(event.error ?? new Error(event.message))
      notify("An unexpected error occurred. Please try again.")
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      console.error("[v0] Unhandled promise rejection:", reason)
      Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)))
      notify("A background request failed. Please try again.")
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [])

  return null
}
