"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface RelativeTimeProps {
  date: Date | string | number
  className?: string
  updateInterval?: number
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 10) return "just now"
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? "s" : ""} ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return "yesterday"
  if (diffInDays < 7) return `${diffInDays} days ago`

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`
}

function formatExactDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function RelativeTime({ date, className, updateInterval = 60000 }: RelativeTimeProps) {
  const dateObj = date instanceof Date ? date : new Date(date)
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(dateObj))

  useEffect(() => {
    // Update relative time periodically
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(dateObj))
    }, updateInterval)

    return () => clearInterval(interval)
  }, [dateObj, updateInterval])

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={formatExactDate(dateObj)}
      className={cn("text-muted-foreground cursor-help", className)}
    >
      {relativeTime}
    </time>
  )
}
