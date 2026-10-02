import { NextRequest, NextResponse } from "next/server"
import { getParticipantSession, getAdminSession } from "@/lib/session"
import { recordSecurityEvent } from "@/lib/security"

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

    const cookieLastActivity = Number(session.lastActivityAt || 0)
    const cookieIsActive = cookieLastActivity > 0 && Date.now() - cookieLastActivity < 30 * 60 * 1000
    if (!cookieIsActive) {
      session.isLoggedIn = false
      await session.destroy()
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Your session expired after 30 minutes of inactivity. Please log in again.", code: "INACTIVITY_TIMEOUT" },
          { status: 401 },
        ),
      }
    }

    session.lastActivityAt = Date.now()
    await session.save()
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
): Promise<{ ok: true; email: string; role: "admin" | "super_admin" | "customer_care" } | { ok: false; response: NextResponse }> {
  try {
    const session = await getAdminSession()
    if (!session.isLoggedIn || !session.email) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized — admin login required" }, { status: 401 }),
      }
    }
    if (requireSuperAdmin && session.role !== "super_admin") {
      return { ok: false, response: NextResponse.json({ error: "Super admin access required" }, { status: 403 }) }
    }
    void recordSecurityEvent({ eventType: "admin_request", actorType: "admin", actorEmail: session.email, request: req, resourceType: "api_route", resourceId: req?.nextUrl.pathname || "unknown" })
    return { ok: true, email: session.email, role: session.role || "admin" }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session error" }, { status: 401 }),
    }
  }
}
