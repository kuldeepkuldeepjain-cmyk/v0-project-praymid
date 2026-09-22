import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query } from "@/lib/db"
import { recordSecurityEvent } from "@/lib/security"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const events = await query(
      `SELECT id, event_type, actor_type, actor_id, actor_email, ip_address, user_agent,
              device_hash, resource_type, resource_id, risk_score, metadata, previous_hash,
              event_hash, created_at
       FROM security_events ORDER BY created_at DESC, id DESC LIMIT 500`,
    )
    const riskFlags = await query(
      `SELECT id, trade_id, participant_email, flag_type, severity, evidence, status, reviewed_by, reviewed_at, created_at
       FROM trade_risk_flags WHERE status = 'open' ORDER BY created_at DESC LIMIT 250`,
    )
    return NextResponse.json({ success: true, events, riskFlags })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Unable to load security events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    if (body?.action !== "review-risk-flag" || typeof body.flagId !== "string" || !["reviewed", "dismissed"].includes(body.status)) {
      return NextResponse.json({ success: false, error: "Invalid security review" }, { status: 400 })
    }
    const { execute } = await import("@/lib/db")
    await execute(
      `UPDATE trade_risk_flags SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [body.status, auth.email, body.flagId],
    )
    await recordSecurityEvent({
      eventType: "risk_flag_reviewed",
      actorType: "admin",
      actorEmail: auth.email,
      resourceType: "trade_risk_flag",
      resourceId: body.flagId,
      metadata: { status: body.status },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to update security review" }, { status: 500 })
  }
}
