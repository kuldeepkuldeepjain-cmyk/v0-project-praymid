import { NextRequest, NextResponse } from "next/server"
import { getParticipantSession, getAdminSession } from "@/lib/session"

// Valid admin emails — used for token-based auth fallback
const ADMIN_EMAILS = ["montyflowchain890@gmail.com", "bitcoin890@gmail.com"]

// ── Participant route guard ────────────────────────────────────────────────
export async function requireParticipantSession(
  req?: NextRequest,
): Promise<{ ok: true; participantId: string; email: string } | { ok: false; response: NextResponse }> {
  // Try token header first (sent by frontend via X-Participant-Token)
  if (req) {
    const token = req.headers.get("X-Participant-Token") || req.headers.get("Authorization")?.replace("Bearer ", "")
    if (token) {
      // Token is the participant email stored in sessionStorage
      return { ok: true, participantId: token, email: token }
    }
  }
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
): Promise<{ ok: true; email: string; role: "admin" | "super_admin" } | { ok: false; response: NextResponse }> {
  // Try X-Admin-Token header first (localStorage token sent by admin frontend)
  if (req) {
    const token = req.headers.get("X-Admin-Token")
    if (token && ADMIN_EMAILS.includes(token.toLowerCase())) {
      const role: "admin" | "super_admin" = token.toLowerCase() === "bitcoin890@gmail.com" ? "super_admin" : "admin"
      if (requireSuperAdmin && role !== "super_admin") {
        return { ok: false, response: NextResponse.json({ error: "Forbidden — super admin only" }, { status: 403 }) }
      }
      return { ok: true, email: token, role }
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
