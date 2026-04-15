import { formatDistanceToNow, format, differenceInSeconds, isPast, parseISO, isAfter } from "date-fns"
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz"

// Timezone detection and management
export const getClientTimezone = (): string => {
  if (typeof window === "undefined") return "UTC"
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

// List of common timezones for user selection
export const COMMON_TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "EST (Eastern Standard Time)", value: "America/New_York" },
  { label: "CST (Central Standard Time)", value: "America/Chicago" },
  { label: "MST (Mountain Standard Time)", value: "America/Denver" },
  { label: "PST (Pacific Standard Time)", value: "America/Los_Angeles" },
  { label: "GMT (Greenwich Mean Time)", value: "Europe/London" },
  { label: "CET (Central European Time)", value: "Europe/Paris" },
  { label: "CET (Central European Time)", value: "Europe/Berlin" },
  { label: "IST (Indian Standard Time)", value: "Asia/Kolkata" },
  { label: "SGT (Singapore Time)", value: "Asia/Singapore" },
  { label: "HKT (Hong Kong Time)", value: "Asia/Hong_Kong" },
  { label: "JST (Japan Standard Time)", value: "Asia/Tokyo" },
  { label: "AEST (Australian Eastern)", value: "Australia/Sydney" },
  { label: "NZST (New Zealand)", value: "Pacific/Auckland" },
]

// Format dates in user's timezone
export const formatDateInTimezone = (
  date: Date | string,
  timezone: string = getClientTimezone(),
  formatStr: string = "MMM dd, yyyy HH:mm"
): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const zonedDate = utcToZonedTime(dateObj, timezone)
    return format(zonedDate, formatStr)
  } catch (error) {
    console.error("[v0] Error formatting date:", error)
    return "Invalid date"
  }
}

// Convert UTC to user timezone
export const utcToUserTimezone = (utcDate: Date | string, timezone: string = getClientTimezone()): Date => {
  try {
    const dateObj = typeof utcDate === "string" ? parseISO(utcDate) : utcDate
    return utcToZonedTime(dateObj, timezone)
  } catch (error) {
    console.error("[v0] Error converting UTC to timezone:", error)
    return new Date()
  }
}

// Convert user timezone to UTC
export const userTimezoneToUtc = (localDate: Date, timezone: string = getClientTimezone()): string => {
  try {
    const utcDate = zonedTimeToUtc(localDate, timezone)
    return utcDate.toISOString()
  } catch (error) {
    console.error("[v0] Error converting timezone to UTC:", error)
    return new Date().toISOString()
  }
}

// Get current time in UTC
export const getCurrentUTC = (): string => {
  return new Date().toISOString()
}

// Get current time in user's timezone as ISO string
export const getCurrentTimeInTimezone = (timezone: string = getClientTimezone()): string => {
  try {
    const now = new Date()
    const zonedTime = utcToZonedTime(now, timezone)
    return zonedTime.toISOString()
  } catch (error) {
    console.error("[v0] Error getting current time in timezone:", error)
    return new Date().toISOString()
  }
}

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.error("[v0] Error formatting relative time:", error)
    return "Invalid date"
  }
}

// Format full datetime
export const formatFullDateTime = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "EEEE, MMMM dd, yyyy 'at' HH:mm:ss")
}

// Format display date
export const formatDisplayDate = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "MMM dd, yyyy 'at' h:mm a")
}

// Format short date
export const formatShortDate = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "MMM dd, yyyy")
}

// Format time only
export const formatTimeOnly = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "h:mm a")
}

// Format date and time
export const formatDateTime = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "MMM dd, yyyy HH:mm")
}

// Format input date (YYYY-MM-DD)
export const formatInputDate = (date: Date | string, timezone: string = getClientTimezone()): string => {
  return formatDateInTimezone(date, timezone, "yyyy-MM-dd")
}

// Check if expiry is in the past
export const isExpired = (expiryDate: Date | string): boolean => {
  try {
    const dateObj = typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate
    return isPast(dateObj)
  } catch (error) {
    console.error("[v0] Error checking expiry:", error)
    return true // Default to expired on error
  }
}

// Check if current time is between two timestamps
export const isCurrentlyBetween = (
  startsAt: string | Date,
  endsAt: string | Date
): boolean => {
  try {
    const now = new Date()
    const startDate = typeof startsAt === "string" ? parseISO(startsAt) : startsAt
    const endDate = typeof endsAt === "string" ? parseISO(endsAt) : endsAt
    return isAfter(now, startDate) && !isPast(endDate)
  } catch (error) {
    console.error("[v0] Error checking time range:", error)
    return false
  }
}

// Get seconds remaining until expiry
export const getSecondsRemaining = (expiryDate: Date | string): number => {
  try {
    const dateObj = typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate
    const seconds = differenceInSeconds(dateObj, new Date())
    return Math.max(0, seconds)
  } catch (error) {
    console.error("[v0] Error getting seconds remaining:", error)
    return 0
  }
}

// Get time until expiry in seconds
export const getTimeUntilExpiry = (expiresAt: string | Date): number => {
  return getSecondsRemaining(expiresAt)
}

// Check if date is expired with buffer
export const isExpiredWithBuffer = (expiryDate: Date | string, bufferSeconds: number = 0): boolean => {
  const secondsRemaining = getSecondsRemaining(expiryDate)
  return secondsRemaining <= bufferSeconds
}

// Format countdown timer (HH:MM:SS)
export const formatCountdown = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

// Format countdown in MM:SS format
export const formatCountdownMMSS = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

// Format time remaining in human-readable format
export const formatTimeRemaining = (expiresAt: string | Date): string => {
  const seconds = getTimeUntilExpiry(expiresAt)
  
  if (seconds === 0) return "Expired"
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) return `${hours}h ${minutes}m remaining`
  if (minutes > 0) return `${minutes}m ${secs}s remaining`
  return `${secs}s remaining`
}

// Add created_at and updated_at to any data object
export const addTimestamps = (data: any): any & { created_at: string; updated_at: string } => {
  const now = new Date().toISOString()
  return {
    ...data,
    created_at: now,
    updated_at: now,
  }
}

// Update only updated_at
export const updateTimestamp = (data: any): any & { updated_at: string } => {
  return {
    ...data,
    updated_at: new Date().toISOString(),
  }
}

// Format date for database storage (ISO string)
export const formatForDatabase = (date: Date = new Date()): string => {
  return date.toISOString()
}

// Parse ISO string to Date
export const parseFromDatabase = (isoString: string): Date => {
  try {
    return parseISO(isoString)
  } catch (error) {
    console.error("[v0] Error parsing database date:", error)
    return new Date()
  }
}

// Get time difference in human readable format
export const formatTimeDifference = (startDate: Date | string, endDate: Date | string): string => {
  try {
    const start = typeof startDate === "string" ? parseISO(startDate) : startDate
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate
    const seconds = differenceInSeconds(end, start)

    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  } catch (error) {
    console.error("[v0] Error formatting time difference:", error)
    return "N/A"
  }
}

// Validate date format (ISO 8601)
export const isValidDate = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  } catch {
    return false
  }
}

// Add hours to a date
export const addHours = (date: Date | string, hours: number): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const newDate = new Date(dateObj.getTime() + hours * 60 * 60 * 1000)
    return newDate.toISOString()
  } catch (error) {
    console.error("[v0] Error adding hours:", error)
    return new Date().toISOString()
  }
}

// Add minutes to a date
export const addMinutes = (date: Date | string, minutes: number): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const newDate = new Date(dateObj.getTime() + minutes * 60 * 1000)
    return newDate.toISOString()
  } catch (error) {
    console.error("[v0] Error adding minutes:", error)
    return new Date().toISOString()
  }
}

// Get start of day in user's timezone
export const getStartOfDay = (
  date: Date | string = new Date(),
  timezone: string = getClientTimezone()
): Date => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const zonedDate = utcToZonedTime(dateObj, timezone)
    zonedDate.setHours(0, 0, 0, 0)
    return zonedDate
  } catch (error) {
    console.error("[v0] Error getting start of day:", error)
    return new Date()
  }
}

// Get end of day in user's timezone
export const getEndOfDay = (
  date: Date | string = new Date(),
  timezone: string = getClientTimezone()
): Date => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const zonedDate = utcToZonedTime(dateObj, timezone)
    zonedDate.setHours(23, 59, 59, 999)
    return zonedDate
  } catch (error) {
    console.error("[v0] Error getting end of day:", error)
    return new Date()
  }
}
