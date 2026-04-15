"use client"

import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("[v0] Error boundary caught:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Something went wrong
          </h1>

          {/* Description */}
          <p className="text-slate-600 mb-6">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>

          {/* Error digest (for tracking) */}
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono mb-6 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={reset}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="w-full h-12"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-500 mt-4">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  )
}
