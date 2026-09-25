import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { recordSecurityEvent } from "@/lib/security"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const [profile, kyc, sessions, activity] = await Promise.all([
      query<{ two_factor_enabled: boolean }>(
        "SELECT two_factor_enabled FROM participant_security_profiles WHERE participant_email = $1",
        [auth.email],
      ),
      query<{ status: string }>(
        "SELECT status FROM participant_kyc_verifications WHERE LOWER(participant_email) = LOWER($1) ORDER BY submitted_at DESC LIMIT 1",
        [auth.email],
      ),
      query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM participant_sessions WHERE LOWER(participant_email) = LOWER($1) AND is_active = true AND expires_at > NOW()",
        [auth.email],
      ).catch(() => [{ count: 0 }]),
      query<{ event_type: string; created_at: string }>(
        `SELECT event_type, created_at FROM security_events
         WHERE LOWER(actor_email) = LOWER($1)
         AND event_type IN ('participant_login_success','participant_login_failed','participant_login_pending_verification','password_changed','two_factor_enabled','two_factor_disabled')
         ORDER BY created_at DESC LIMIT 8`,
      ).catch(() => []),
    ])

    const kycStatus = kyc[0]?.status || "not_started"
    const protectionItems = [
      { id: "identity", label: "Identity verification", status: kycStatus === "approved" ? "verified" : kycStatus === "not_started" ? "action_required" : "in_review" },
      { id: "two_factor", label: "Two-factor authentication", status: profile[0]?.two_factor_enabled ? "enabled" : "recommended" },
      { id: "sessions", label: "Active sessions", status: sessions[0]?.count > 0 ? "monitored" : "none" },
    ]

    return NextResponse.json({
      success: true,
      protectionItems,
      activeSessionCount: sessions[0]?.count || 0,
      recentActivity: activity.map((item) => ({ event: item.event_type, occurredAt: item.created_at })),
      privacy: { message: "Security telemetry is protected and only used to secure your account." },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to load security settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    if (body?.action !== "acknowledge-security-notice") {
      return NextResponse.json({ success: false, error: "Unsupported security action" }, { status: 400 })
    }
    await recordSecurityEvent({ eventType: "security_notice_acknowledged", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save security action" }, { status: 500 })
  }
}

void NextResponse
