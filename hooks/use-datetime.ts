"use client"

import { useEffect, useState, useCallback } from "react"
import { useLocalStorage } from "./use-local-storage"
import { getClientTimezone, getCurrentTimeInTimezone } from "@/lib/datetime-utils"

/**
 * Hook for managing user's timezone preference
 */
export const useTimezone = () => {
  const [timezone, setTimezoneState] = useLocalStorage<string>("user-timezone", getClientTimezone())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz)
    // Notify other tabs of timezone change
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("timezone-changed", { detail: { timezone: tz } }))
    }
  }, [setTimezoneState])

  return {
    timezone,
    setTimezone,
    isLoading,
  }
}

/**
 * Hook for server time synchronization
 * Keeps client time in sync with server time
 */
export const useServerTime = () => {
  const [clientTime, setClientTime] = useState<Date>(new Date())
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0)
  const [isSynced, setIsSynced] = useState(false)

  // Sync with server time on mount
  useEffect(() => {
    const syncServerTime = async () => {
      try {
        const response = await fetch("/api/server-time", { cache: "no-store" })
        const data = await response.json()
        const serverTime = new Date(data.timestamp)
        const clientTimeNow = new Date()
        const offset = serverTime.getTime() - clientTimeNow.getTime()
        setServerTimeOffset(offset)
        setIsSynced(true)
      } catch (error) {
        console.error("[v0] Failed to sync server time:", error)
        setIsSynced(false)
      }
    }

    syncServerTime()
    // Re-sync every 5 minutes
    const interval = setInterval(syncServerTime, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Update client time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const adjustedTime = new Date(now.getTime() + serverTimeOffset)
      setClientTime(adjustedTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [serverTimeOffset])

  return {
    currentTime: clientTime,
    serverTimeOffset,
    isSynced,
  }
}

/**
 * Hook for managing countdowns/timers
 */
export const useCountdown = (expiresAt: string | Date, onExpire?: () => void) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateRemaining = () => {
      const expiryDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
      const now = new Date()
      const remaining = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000))

      setSecondsRemaining(remaining)

      if (remaining === 0) {
        setIsExpired(true)
        onExpire?.()
      } else {
        setIsExpired(false)
      }
    }

    calculateRemaining()
    const interval = setInterval(calculateRemaining, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return {
    secondsRemaining,
    isExpired,
  }
}

/**
 * Hook for expiry validation
 */
export const useExpiryCheck = (expiresAt: string | Date) => {
  const { secondsRemaining, isExpired } = useCountdown(expiresAt)

  const isExpiredWithBuffer = (bufferSeconds: number = 60) => {
    return secondsRemaining <= bufferSeconds
  }

  const getRemainingPercentage = () => {
    const totalSeconds = typeof expiresAt === "string"
      ? new Date(expiresAt).getTime() - new Date(new Date().toISOString().split("T")[0]).getTime()
      : (expiresAt as Date).getTime() - new Date(new Date().toISOString().split("T")[0]).getTime()

    return Math.max(0, (secondsRemaining / totalSeconds) * 100)
  }

  return {
    secondsRemaining,
    isExpired,
    isExpiredWithBuffer,
    getRemainingPercentage,
  }
}

/**
 * Hook for date/time formatting with timezone
 */
export const useDateFormatting = (timezone?: string) => {
  const { timezone: userTimezone } = useTimezone()
  const effectiveTimezone = timezone || userTimezone

  const formatDate = (date: string | Date, format: string = "MMM dd, yyyy HH:mm") => {
    try {
      const { formatDateInTimezone } = require("@/lib/datetime-utils")
      return formatDateInTimezone(date, effectiveTimezone, format)
    } catch (error) {
      console.error("[v0] Error formatting date:", error)
      return "Invalid date"
    }
  }

  const formatRelative = (date: string | Date) => {
    try {
      const { formatRelativeTime } = require("@/lib/datetime-utils")
      return formatRelativeTime(date)
    } catch (error) {
      console.error("[v0] Error formatting relative time:", error)
      return "Invalid date"
    }
  }

  return {
    formatDate,
    formatRelative,
    timezone: effectiveTimezone,
  }
}
