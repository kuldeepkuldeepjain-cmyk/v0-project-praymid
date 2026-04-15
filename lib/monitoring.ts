import * as Sentry from "@sentry/nextjs"

/**
 * Log error to Sentry with context
 */
export function logError(error: Error | unknown, context?: Record<string, any>) {
  console.error("[v0] Error:", error, context)
  
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Log warning to Sentry
 */
export function logWarning(message: string, context?: Record<string, any>) {
  console.warn("[v0] Warning:", message, context)
  
  Sentry.captureMessage(message, {
    level: "warning",
    extra: context,
  })
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, data?: Record<string, any>) {
  Sentry.captureMessage(eventName, {
    level: "info",
    extra: data,
  })
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { email?: string; username?: string; role?: string }) {
  Sentry.setUser({
    email: user.email,
    username: user.username,
    role: user.role,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  })
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, operation: string) {
  return Sentry.startTransaction({
    name,
    op: operation,
  })
}

/**
 * Measure function performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, "function")
  
  try {
    const result = await fn()
    transaction.setStatus("ok")
    return result
  } catch (error) {
    transaction.setStatus("internal_error")
    logError(error, { function: name })
    throw error
  } finally {
    transaction.finish()
  }
}
