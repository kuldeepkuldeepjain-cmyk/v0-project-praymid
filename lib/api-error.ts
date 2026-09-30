import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

/**
 * Standardized API error handling model for route handlers.
 *
 * Usage:
 *   export const POST = withApiErrorHandling(async (request) => {
 *     if (!isValid) throw new ApiError("Invalid input", 400)
 *     ...
 *     return NextResponse.json({ success: true, data })
 *   })
 *
 * Every response (success or failure) uses the same JSON shape:
 *   { success: true, data }
 *   { success: false, error: { message, code? } }
 *
 * Any error thrown inside the wrapped handler (including unexpected ones,
 * e.g. a database timeout) is caught, logged, reported to Sentry, and turned
 * into a safe, user-facing JSON error instead of crashing the route or
 * leaking a stack trace to the client.
 */

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status = 400, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init)
}

export function apiErrorResponse(message: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error: { message, code } }, { status })
}

type RouteHandler<T extends unknown[]> = (...args: T) => Promise<Response>

export function withApiErrorHandling<T extends unknown[]>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`[v0] API error (${error.status}):`, error.message)
        if (error.status >= 500) Sentry.captureException(error)
        return apiErrorResponse(error.message, error.status, error.code)
      }

      const message = error instanceof Error ? error.message : "Unexpected error"
      console.error("[v0] Unhandled API error:", message, error)
      Sentry.captureException(error)
      return apiErrorResponse("Something went wrong. Please try again.", 500)
    }
  }
}
