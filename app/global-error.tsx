"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertOctagon, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] Global fatal error:", error?.message, error?.stack)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-[#080c14] text-slate-100 antialiased">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-[#0d1220] shadow-2xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5 ring-1 ring-red-500/30">
              <AlertOctagon className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-slate-50 mb-2 text-balance">Application Error</h1>
            <p className="text-slate-400 mb-6 text-pretty">
              Something unexpected happened and the application couldn&apos;t continue. Your data is safe. Please try
              again or return to the homepage.
            </p>

            {error.digest && (
              <p className="text-xs text-slate-500 font-mono mb-6 px-3 py-2 bg-black/30 rounded-lg border border-white/5">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="w-full h-12 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = "/"
                }}
                className="w-full h-12 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 font-medium transition-colors"
              >
                Go to Homepage
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-5">
              If this keeps happening, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
