import { NextRequest, NextResponse } from "next/server"
import { getParticipantSession, getAdminSession } from "@/lib/session"
import { execute, query } from "@/lib/db"
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

    const rows = await query<{ id: string }>(
      `SELECT id
       FROM participant_sessions
       WHERE id = $1
         AND participant_id = $2
         AND is_active = TRUE
         AND last_activity > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [session.sessionId || "", session.participantId],
    )
    if (rows.length === 0) {
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

    await execute("UPDATE participant_sessions SET last_activity = NOW() WHERE id = $1", [rows[0].id])
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
