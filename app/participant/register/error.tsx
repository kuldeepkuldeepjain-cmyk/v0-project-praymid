'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console so we can see what it is
    console.error("[v0] Registration Error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-4 bg-white rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-red-600">Something Went Wrong</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4 max-h-64 overflow-y-auto">
          <p className="text-sm text-red-800 font-mono">{error.message}</p>
          {error.stack && (
            <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>
          <a
            href="/"
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 font-medium text-center"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
