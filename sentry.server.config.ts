import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  
  // Enable debugging in development
  debug: process.env.NODE_ENV === "development",
})
