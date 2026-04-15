import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  
  // Additional configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter out non-critical errors
  beforeSend(event, hint) {
    const error = hint.originalException
    
    // Filter out network errors from ad blockers
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message)
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return null
      }
    }
    
    return event
  },
  
  // Add user context
  beforeBreadcrumb(breadcrumb) {
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.category === 'console') {
      return null
    }
    return breadcrumb
  },
})
