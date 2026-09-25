import { NextRequest, NextResponse } from "next/server"
import { getParticipantSession, getAdminSession } from "@/lib/session"
import { recordSecurityEvent } from "@/lib/security"

// Valid admin emails — used for token-based auth fallback
const ADMIN_EMAILS = [process.env.ADMIN_EMAIL, process.env.SUPER_ADMIN_EMAIL, "montyflowchain890@gmail.com"]
  .filter((email): email is string => Boolean(email))
  .map((email) => email.toLowerCase())

// ── Participant route guard ────────────────────────────────────────────────
export async function requireParticipantSession(
  req?: NextRequest,
): Promise<{ ok: true; participantId: string; email: string } | { ok: false; response: NextResponse }> {
  // Client headers are treated as context only. Authorization comes from the
  // signed, httpOnly iron-session cookie so an email cannot be used as a token.
  try {
    const session = await getParticipantSession()
    if (!session.isLoggedIn || !session.participantId || !session.email) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 }),
      }
    }
    return { ok: true, participantId: session.participantId, email: session.email }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session error" }, { status: 401 }),
    }
  }
}

// ── Admin route guard ──────────────────────────────────────────────────────
export async function requireAdminSession(
  req?: NextRequest,
  requireSuperAdmin = false,
): Promise<{ ok: true; email: string; role: "admin" } | { ok: false; response: NextResponse }> {
  // Try X-Admin-Token header first (localStorage token sent by admin frontend)
  if (req) {
    const token = req.headers.get("X-Admin-Token")
    if (token && ADMIN_EMAILS.includes(token.toLowerCase())) {
      void recordSecurityEvent({ eventType: "admin_request", actorType: "admin", actorEmail: token, request: req, resourceType: "api_route", resourceId: req.nextUrl.pathname })
      return { ok: true, email: token, role: "admin" }
    }
  }
  // Fall back to iron-session cookie
  try {
    const session = await getAdminSession()
    if (!session.isLoggedIn || !session.email) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized — admin login required" }, { status: 401 }),
      }
    }
    void recordSecurityEvent({ eventType: "admin_request", actorType: "admin", actorEmail: session.email, request: req, resourceType: "api_route", resourceId: req?.nextUrl.pathname || "unknown" })
    return { ok: true, email: session.email, role: "admin" }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session error" }, { status: 401 }),
    }
  }
}
