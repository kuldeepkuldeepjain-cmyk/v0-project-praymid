"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    const message = error?.message?.toLowerCase() ?? ""
    if (!message.includes("session") && !message.includes("value is null") && !message.includes("invalid participant")) {
      return
    }

    sessionStorage.removeItem("participant_token")
    sessionStorage.removeItem("participant_email")
    sessionStorage.removeItem("participant_wallet")
    localStorage.removeItem("participantData")
    localStorage.removeItem("participantToken")
    fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
    router.replace("/participant/login?session=expired")
  }, [error, router])

  return <ErrorBoundary error={error} reset={reset} />
}
