import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the application URL dynamically
 * Checks NEXT_PUBLIC_APP_URL env var first, then falls back to request origin or window.location
 */
export function getAppUrl(request?: Request): string {
  // First check for environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // On server, try to get from request headers
  if (request) {
    const host = request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    if (host) {
      return `${protocol}://${host}`
    }
  }

  // On client, use window.location
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Final fallback
  return "http://localhost:3000"
}
