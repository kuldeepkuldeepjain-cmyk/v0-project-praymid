import { getIronSession, IronSession } from "iron-session"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { isIP } from "node:net"
import { execute, withTransaction } from "@/lib/db"
import type { SecurityContext } from "@/lib/security"

// ── Session data shapes ────────────────────────────────────────────────────

export interface ParticipantSessionData {
  participantId: string
  email: string
  role: "participant"
  sessionId?: string
  lastActivityAt?: number
}

export interface AdminSessionData {
  email: string
  role: "admin" | "super_admin" | "customer_care"
}

export type SessionData = (ParticipantSessionData | AdminSessionData) & {
  isLoggedIn: boolean
}

// ── Cookie names ───────────────────────────────────────────────────────────

const PARTICIPANT_COOKIE = "participant_session"
const ADMIN_COOKIE = "admin_session"

// ── Secret — must be at least 32 chars ────────────────────────────────────

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    // Fallback for dev; in production SESSION_SECRET must be set
    return "flowchain-default-secret-change-in-production-32chars"
  }
  return secret
}

const BASE_OPTIONS = {
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days; users remain signed in across normal trading sessions
  },
}

// ── Participant session helpers ────────────────────────────────────────────

export async function getParticipantSession(): Promise<IronSession<ParticipantSessionData & { isLoggedIn?: boolean }>> {
  const cookieStore = await cookies()
  return getIronSession<ParticipantSessionData & { isLoggedIn?: boolean }>(cookieStore, {
    ...BASE_OPTIONS,
    password: getSecret(),
    cookieName: PARTICIPANT_COOKIE,
  })
}

export async function setParticipantSession(data: ParticipantSessionData): Promise<void> {
  const session = await getParticipantSession()
  session.participantId = data.participantId
  session.email = data.email
  session.role = "participant"
  if (data.sessionId) session.sessionId = data.sessionId
  if (data.lastActivityAt) session.lastActivityAt = data.lastActivityAt
  session.isLoggedIn = true
  await session.save()
}

export async function startParticipantLogin(participant: { id: string; email: string }, context: SecurityContext): Promise<void> {
  const sessionId = randomUUID()
  const ipAddress = context.ipAddress && isIP(context.ipAddress) ? context.ipAddress : null

  await withTransaction(async (client) => {
    await client.query("UPDATE participants SET last_login = NOW(), last_seen = NOW(), updated_at = NOW() WHERE id = $1", [participant.id])
    await client.query("UPDATE participant_sessions SET is_active = false, last_activity = NOW() WHERE participant_id = $1 AND is_active = true", [participant.id])
    await client.query(
      `INSERT INTO participant_sessions (id, participant_id, participant_email, token, device_fingerprint, ip_address, user_agent)
       VALUES ($1::uuid, $2::uuid, $3, $4::text, $5, $6::inet, $7)`,
      [sessionId, participant.id, participant.email, sessionId, context.deviceHash, ipAddress, context.userAgent],
    )
  })
  await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant", sessionId, lastActivityAt: Date.now() })
}

export async function clearParticipantSession(): Promise<void> {
  try {
    const session = await getParticipantSession()
    if (session.email) await execute("UPDATE participant_sessions SET is_active = false, last_activity = NOW() WHERE LOWER(participant_email) = LOWER($1)", [session.email]).catch(() => {})
    await session.destroy()
  } catch {
    // A stale or malformed cookie should not block logout.
  }
}

// ── Admin session helpers ──────────────────────────────────────────────────

export async function getAdminSession(): Promise<IronSession<AdminSessionData & { isLoggedIn?: boolean }>> {
  const cookieStore = await cookies()
  return getIronSession<AdminSessionData & { isLoggedIn?: boolean }>(cookieStore, {
    ...BASE_OPTIONS,
    password: getSecret(),
    cookieName: ADMIN_COOKIE,
  })
}

export async function setAdminSession(data: AdminSessionData): Promise<void> {
  const session = await getAdminSession()
  session.email = data.email
  session.role = data.role
  session.isLoggedIn = true
  await session.save()
}

export async function clearAdminSession(): Promise<void> {
  const session = await getAdminSession()
  session.destroy()
}

// ── Request-level helpers (for Route Handlers with NextRequest) ────────────

export async function getParticipantSessionFromReq(
  req: NextRequest,
): Promise<(ParticipantSessionData & { isLoggedIn?: boolean }) | null> {
  try {
    const session = await getIronSession<ParticipantSessionData & { isLoggedIn?: boolean }>(req, new NextResponse(), {
      ...BASE_OPTIONS,
      password: getSecret(),
      cookieName: PARTICIPANT_COOKIE,
    })
    if (!session.isLoggedIn || !session.participantId) return null
    return session
  } catch {
    return null
  }
}

export async function getAdminSessionFromReq(
  req: NextRequest,
): Promise<(AdminSessionData & { isLoggedIn?: boolean }) | null> {
  try {
    const session = await getIronSession<AdminSessionData & { isLoggedIn?: boolean }>(req, new NextResponse(), {
      ...BASE_OPTIONS,
      password: getSecret(),
      cookieName: ADMIN_COOKIE,
    })
    if (!session.isLoggedIn || !session.email) return null
    return session
  } catch {
    return null
  }
}
