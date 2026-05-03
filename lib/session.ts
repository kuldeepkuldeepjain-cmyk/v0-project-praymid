import { getIronSession, IronSession } from "iron-session"
import { NextRequest, NextResponse } from "next/server"

// ── Session data shapes ────────────────────────────────────────────────────

export interface ParticipantSessionData {
  participantId: string
  email: string
  role: "participant"
}

export interface AdminSessionData {
  email: string
  role: "admin" | "super_admin"
}

export type SessionData = (ParticipantSessionData | AdminSessionData) & {
  isLoggedIn: boolean
}

// ── Cookie names ───────────────────────────────────────────────────────────

const PARTICIPANT_COOKIE = "participant_session"
const ADMIN_COOKIE = "admin_session"

// ── Secret ─────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
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
    maxAge: 60 * 60 * 24 * 7,
  },
}

// ── Participant session helpers ────────────────────────────────────────────

export async function getParticipantSession(): Promise<IronSession<ParticipantSessionData & { isLoggedIn?: boolean }>> {
  // Dynamic import avoids module-level crash in Route Handlers
  const { cookies } = await import("next/headers")
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
  session.isLoggedIn = true
  await session.save()
}

export async function clearParticipantSession(): Promise<void> {
  const session = await getParticipantSession()
  session.destroy()
}

// ── Admin session helpers ──────────────────────────────────────────────────

export async function getAdminSession(): Promise<IronSession<AdminSessionData & { isLoggedIn?: boolean }>> {
  const { cookies } = await import("next/headers")
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
