'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface AutomatchEvent {
  type: 'contribution_matched' | 'payout_matched' | 'error'
  contributionId: string
  payoutId?: string
  matchedAt?: string
  recipientDetails?: {
    name: string
    email: string
    payoutMethod: string
    amount: number
  }
  message: string
}

export function useAutomatchWebSocket(participantEmail: string | undefined, onMatch: (event: AutomatchEvent) => void) {
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckedRef = useRef<string | null>(null)

  const checkForMatch = useCallback(async () => {
    if (!participantEmail) return

    try {
      // Poll for matched contributions via the API
      const response = await fetch(`/api/participant/contributions/status?email=${encodeURIComponent(participantEmail)}`)
      if (!response.ok) return

      const { matched, contribution, payout } = await response.json()

      if (matched && contribution && payout && lastCheckedRef.current !== contribution.id) {
        lastCheckedRef.current = contribution.id
        console.log('[v0] Automatch detected:', { contribution, payout })
        
        onMatch({
          type: 'contribution_matched',
          contributionId: contribution.id,
          payoutId: payout.id,
          matchedAt: contribution.matched_at,
          recipientDetails: {
            name: payout.participant_name || payout.participant_email,
            email: payout.participant_email,
            payoutMethod: payout.payout_method,
            amount: payout.amount,
          },
          message: `Your contribution has been matched with a payout!`
        })
      }
    } catch (err) {
      console.error('[v0] Error checking for match:', err)
    }
  }, [participantEmail, onMatch])

  useEffect(() => {
    // Check immediately, then every 10 seconds
    checkForMatch()
    pollingTimeoutRef.current = setInterval(checkForMatch, 10000)

    return () => {
      if (pollingTimeoutRef.current) {
        clearInterval(pollingTimeoutRef.current)
      }
    }
  }, [checkForMatch])

  return null
}
