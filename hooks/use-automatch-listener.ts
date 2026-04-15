import { useEffect, useCallback, useRef } from "react"

/**
 * Polls the contribution status endpoint every 10 seconds to detect automatch.
 * When a new match is detected, calls onMatchDetected to trigger a page refresh.
 */
export function useAutomatchListener(
  email: string | null | undefined,
  onMatchDetected?: () => void
) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMatchedIdRef = useRef<string>("")

  const checkForMatch = useCallback(async () => {
    if (!email) return

    try {
      const response = await fetch(
        `/api/participant/contributions/status?email=${encodeURIComponent(email)}`
      )
      if (!response.ok) return

      const data = await response.json()

      if (
        data.matched &&
        data.contribution &&
        data.contribution.id !== lastMatchedIdRef.current
      ) {
        lastMatchedIdRef.current = data.contribution.id
        if (onMatchDetected) onMatchDetected()
      }
    } catch {
      // Silently ignore network errors — polling will retry
    }
  }, [email, onMatchDetected])

  useEffect(() => {
    if (!email) return

    checkForMatch()
    pollingIntervalRef.current = setInterval(checkForMatch, 10000)

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [email, checkForMatch])

  return { isConnected: true }
}
