"use client"

import { useState, useEffect, useCallback } from "react"
import { getClientTimezone } from "@/lib/datetime-utils"

export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string>("")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Get timezone from localStorage or detect from browser
    const storedTimezone = localStorage.getItem("user-timezone")
    const detectedTimezone = storedTimezone || getClientTimezone()
    setTimezone(detectedTimezone)
    setIsLoaded(true)
  }, [])

  const setUserTimezone = useCallback((tz: string) => {
    setTimezone(tz)
    localStorage.setItem("user-timezone", tz)
  }, [])

  return {
    timezone,
    setUserTimezone,
    isLoaded,
  }
}

export const useServerTime = () => {
  const [serverTime, setServerTime] = useState<Date>(new Date())
  const [timeDiff, setTimeDiff] = useState<number>(0)

  useEffect(() => {
    const syncTime = async () => {
      try {
        const response = await fetch("/api/server-time")
        const data = await response.json()
        const serverDate = new Date(data.timestamp)
        const clientDate = new Date()
        setServerTime(serverDate)
        setTimeDiff(serverDate.getTime() - clientDate.getTime())
      } catch (error) {
        console.error("[v0] Failed to sync server time:", error)
      }
    }

    // Sync on mount
    syncTime()

    // Sync every 60 seconds
    const interval = setInterval(syncTime, 60000)

    return () => clearInterval(interval)
  }, [])

  // Get current server time adjusted for client clock drift
  const getCurrentServerTime = useCallback((): Date => {
    const now = new Date()
    const adjustedTime = new Date(now.getTime() + timeDiff)
    return adjustedTime
  }, [timeDiff])

  return {
    serverTime,
    timeDiff,
    getCurrentServerTime,
  }
}

export const useCountdown = (expiryDate: Date | string, onExpire?: () => void) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate

    const updateCountdown = () => {
      const now = new Date()
      const diff = Math.floor((expiry.getTime() - now.getTime()) / 1000)

      if (diff <= 0) {
        setSecondsRemaining(0)
        setIsExpired(true)
        onExpire?.()
      } else {
        setSecondsRemaining(diff)
        setIsExpired(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [expiryDate, onExpire])

  return {
    secondsRemaining,
    isExpired,
    minutesRemaining: Math.floor(secondsRemaining / 60),
    hoursRemaining: Math.floor(secondsRemaining / 3600),
  }
}
