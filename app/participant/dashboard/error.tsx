"use client"

import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // A render or data error must not destroy a valid session. The previous
  // behavior cleared auth storage and logged users out for transient errors.

  return <ErrorBoundary error={error} reset={reset} />
}
