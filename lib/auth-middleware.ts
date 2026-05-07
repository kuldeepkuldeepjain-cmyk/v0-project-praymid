import { NextRequest, NextResponse } from "next/server"
import { getParticipantSession, getAdminSession } from "@/lib/session"

// ── Participant route guard ────────────────────────────────────────────────
// Returns the session data if valid, or a 401 NextResponse if not.
export async function requireParticipantSession(
  _req?: NextRequest,
): Promise<{ ok: true; participantId: string; email: string } | { ok: false; response: NextResponse }> {
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
// Returns the session data if valid admin/super_admin, or a 401/403 NextResponse.
export async function requireAdminSession(
  _req?: NextRequest,
  requireSuperAdmin = false,
): Promise<{ ok: true; email: string; role: "admin" | "super_admin" } | { ok: false; response: NextResponse }> {
  try {
    const session = await getAdminSession()
    if (!session.isLoggedIn || !session.email) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized — admin login required" }, { status: 401 }),
      }
    }
    if (requireSuperAdmin && session.role !== "super_admin") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden — super admin only" }, { status: 403 }),
      }
    }
    return { ok: true, email: session.email, role: session.role as "admin" | "super_admin" }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session error" }, { status: 401 }),
    }
  }
}
