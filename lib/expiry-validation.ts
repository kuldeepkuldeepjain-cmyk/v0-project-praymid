import {
  isExpired,
  getSecondsRemaining,
  isExpiredWithBuffer,
  getTimeUntilExpiry,
  formatTimeRemaining,
  isCurrentlyBetween,
} from "@/lib/datetime-utils"

/**
 * Validate OTP expiry
 */
export const validateOTPExpiry = (expiresAt: string | Date): {
  isExpired: boolean
  secondsRemaining: number
  isValid: boolean
  message: string
} => {
  const expired = isExpired(expiresAt)
  const secondsRemaining = getSecondsRemaining(expiresAt)
  
  return {
    isExpired: expired,
    secondsRemaining,
    isValid: !expired && secondsRemaining > 0,
    message: expired ? "OTP has expired" : `OTP valid for ${formatTimeRemaining(expiresAt)}`,
  }
}

/**
 * Validate payment submission deadline
 */
export const validatePaymentDeadline = (deadlineAt: string | Date): {
  isPastDeadline: boolean
  timeRemaining: number
  isValid: boolean
  message: string
} => {
  const pastDeadline = isExpired(deadlineAt)
  const timeRemaining = getSecondsRemaining(deadlineAt)
  
  return {
    isPastDeadline: pastDeadline,
    timeRemaining,
    isValid: !pastDeadline && timeRemaining > 0,
    message: pastDeadline ? "Payment deadline has passed" : `Deadline in ${formatTimeRemaining(deadlineAt)}`,
  }
}

/**
 * Validate session expiry
 */
export const validateSessionExpiry = (expiresAt: string | Date): {
  isSessionExpired: boolean
  timeRemaining: number
  warningThreshold: boolean // true if within 5 minutes
  criticalThreshold: boolean // true if within 1 minute
  isValid: boolean
  message: string
} => {
  const sessionExpired = isExpired(expiresAt)
  const timeRemaining = getSecondsRemaining(expiresAt)
  const withinWarning = isExpiredWithBuffer(expiresAt, 300) // 5 minutes
  const withinCritical = isExpiredWithBuffer(expiresAt, 60) // 1 minute
  
  let message = "Session is valid"
  if (sessionExpired) {
    message = "Session has expired"
  } else if (withinCritical) {
    message = "Session expires very soon"
  } else if (withinWarning) {
    message = "Session will expire soon"
  }
  
  return {
    isSessionExpired: sessionExpired,
    timeRemaining,
    warningThreshold: withinWarning,
    criticalThreshold: withinCritical,
    isValid: !sessionExpired && timeRemaining > 0,
    message,
  }
}

/**
 * Validate topup request expiry
 */
export const validateTopupExpiry = (expiresAt: string | Date): {
  isExpired: boolean
  secondsRemaining: number
  isValid: boolean
  status: "active" | "warning" | "critical" | "expired"
  message: string
} => {
  const expired = isExpired(expiresAt)
  const secondsRemaining = getSecondsRemaining(expiresAt)
  const withinWarning = isExpiredWithBuffer(expiresAt, 3600) // 1 hour
  const withinCritical = isExpiredWithBuffer(expiresAt, 600) // 10 minutes
  
  let status: "active" | "warning" | "critical" | "expired" = "active"
  let message = "Topup request is active"
  
  if (expired) {
    status = "expired"
    message = "Topup request has expired"
  } else if (withinCritical) {
    status = "critical"
    message = `Topup expires in ${formatTimeRemaining(expiresAt)}`
  } else if (withinWarning) {
    status = "warning"
    message = `Topup expires in ${formatTimeRemaining(expiresAt)}`
  }
  
  return {
    isExpired: expired,
    secondsRemaining,
    isValid: !expired && secondsRemaining > 0,
    status,
    message,
  }
}

/**
 * Validate event/prediction window
 */
export const validateEventWindow = (
  startsAt: string | Date,
  endsAt: string | Date
): {
  hasStarted: boolean
  hasEnded: boolean
  isOpen: boolean
  timeUntilStart: number
  timeUntilEnd: number
  status: "not-started" | "open" | "closed"
  message: string
} => {
  const now = new Date()
  const startDate = typeof startsAt === "string" ? new Date(startsAt) : startsAt
  const endDate = typeof endsAt === "string" ? new Date(endsAt) : endsAt
  
  const hasStarted = now >= startDate
  const hasEnded = now >= endDate
  const isOpen = isCurrentlyBetween(startsAt, endsAt)
  
  const timeUntilStart = Math.max(0, Math.floor((startDate.getTime() - now.getTime()) / 1000))
  const timeUntilEnd = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / 1000))
  
  let status: "not-started" | "open" | "closed" = "closed"
  let message = "Event window has closed"
  
  if (!hasStarted) {
    status = "not-started"
    message = `Event starts in ${formatTimeRemaining(startsAt)}`
  } else if (isOpen) {
    status = "open"
    message = `Event closes in ${formatTimeRemaining(endsAt)}`
  }
  
  return {
    hasStarted,
    hasEnded,
    isOpen,
    timeUntilStart,
    timeUntilEnd,
    status,
    message,
  }
}

/**
 * Validate payout request status
 */
export const validatePayoutRequest = (
  status: string,
  createdAt: string | Date,
  processesAt?: string | Date
): {
  canCancel: boolean
  canEdit: boolean
  isProcessing: boolean
  isProcessed: boolean
  isPending: boolean
  message: string
  warningMessage?: string
} => {
  const createdDate = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  const processingDate = processesAt ? (typeof processesAt === "string" ? new Date(processesAt) : processesAt) : null
  
  const now = new Date()
  const timeSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / 1000)
  const withinCancellationWindow = timeSinceCreation < 3600 // 1 hour window
  
  const isPending = status === "pending"
  const isProcessing = status === "processing"
  const isProcessed = status === "processed" || status === "completed"
  
  let message = ""
  let warningMessage: string | undefined
  
  if (isPending) {
    message = "Payout request is pending"
    if (withinCancellationWindow) {
      warningMessage = "You can cancel this request within the first hour"
    }
  } else if (isProcessing) {
    message = "Payout is being processed"
    if (processingDate) {
      warningMessage = `Processing started ${formatTimeRemaining(processingDate)}`
    }
  } else if (isProcessed) {
    message = "Payout has been completed"
  }
  
  return {
    canCancel: isPending && withinCancellationWindow,
    canEdit: isPending && withinCancellationWindow,
    isProcessing,
    isProcessed,
    isPending,
    message,
    warningMessage,
  }
}

/**
 * Validate prediction submission window
 */
export const validatePredictionWindow = (
  submissionDeadline: string | Date
): {
  canSubmit: boolean
  secondsRemaining: number
  isOpen: boolean
  message: string
  urgency: "normal" | "warning" | "critical" | "closed"
} => {
  const isSubmissionOpen = !isExpired(submissionDeadline)
  const secondsRemaining = getSecondsRemaining(submissionDeadline)
  const withinWarning = isExpiredWithBuffer(submissionDeadline, 600) // 10 minutes
  const withinCritical = isExpiredWithBuffer(submissionDeadline, 120) // 2 minutes
  
  let urgency: "normal" | "warning" | "critical" | "closed" = "normal"
  let message = "Submission window is open"
  
  if (!isSubmissionOpen) {
    urgency = "closed"
    message = "Submission window has closed"
  } else if (withinCritical) {
    urgency = "critical"
    message = `Hurry! Only ${formatTimeRemaining(submissionDeadline)} to submit`
  } else if (withinWarning) {
    urgency = "warning"
    message = `Submit soon! ${formatTimeRemaining(submissionDeadline)} remaining`
  }
  
  return {
    canSubmit: isSubmissionOpen,
    secondsRemaining,
    isOpen: isSubmissionOpen,
    message,
    urgency,
  }
}
