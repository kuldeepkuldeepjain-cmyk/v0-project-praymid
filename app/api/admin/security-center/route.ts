import { NextRequest, NextResponse } from "next/server"
import { execute, query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { recordSecurityEvent } from "@/lib/security"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const [reviews, rules, restrictions, events, kyc] = await Promise.all([
      query(`SELECT id, participant_email, signal_type, severity, risk_score, status, assigned_to, decision_notes, created_at, reviewed_at, reviewed_by FROM security_reviews ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, risk_score DESC, created_at DESC LIMIT 200`),
      query(`SELECT id, category, label, description, enabled, threshold, action, updated_by, updated_at FROM security_rule_configs ORDER BY category, label`),
      query(`SELECT id, participant_email, restriction_type, reason_code, status, effective_until, created_by, created_at FROM account_restrictions WHERE status = 'active' ORDER BY created_at DESC LIMIT 100`),
      query(`SELECT id, event_type, actor_type, actor_email, resource_type, resource_id, risk_score, metadata, event_hash, created_at FROM security_events ORDER BY created_at DESC, id DESC LIMIT 300`),
      query(`SELECT id, participant_email, status, submitted_at, reviewed_at, reviewed_by FROM participant_kyc_verifications WHERE status IN ('pending','under_review') ORDER BY submitted_at ASC LIMIT 100`),
    ])
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), reviews, rules, restrictions, events, kycQueue: kyc, summary: { openReviews: reviews.filter((r: any) => r.status === "open").length, highRisk: reviews.filter((r: any) => ["high", "critical"].includes(r.severity) && r.status === "open").length, activeRestrictions: restrictions.length, pendingKyc: kyc.length } })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to load security operations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    if (body?.action === "update-rule" && typeof body.ruleId === "string") {
      const threshold = Number(body.threshold)
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100 || typeof body.enabled !== "boolean") return NextResponse.json({ success: false, error: "Invalid rule configuration" }, { status: 400 })
      await execute("UPDATE security_rule_configs SET enabled = $1, threshold = $2, updated_by = $3, updated_at = NOW() WHERE id = $4", [body.enabled, threshold, auth.email, body.ruleId])
      await recordSecurityEvent({ eventType: "security_rule_updated", actorType: "admin", actorEmail: auth.email, request, resourceType: "security_rule", resourceId: body.ruleId, metadata: { enabled: body.enabled, threshold } })
      return NextResponse.json({ success: true })
    }
    if (body?.action === "review" && typeof body.reviewId === "string" && ["in_review", "confirmed", "dismissed"].includes(body.status)) {
      await execute("UPDATE security_reviews SET status = $1, decision_notes = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4", [body.status, String(body.notes || "").slice(0, 1000), auth.email, body.reviewId])
      if (body.status === "confirmed" && body.restrictionType && typeof body.participantEmail === "string") {
        await execute("INSERT INTO account_restrictions (participant_email, restriction_type, reason_code, created_by) VALUES ($1, $2, $3, $4)", [body.participantEmail.toLowerCase(), body.restrictionType, "confirmed_security_violation", auth.email])
      }
      await recordSecurityEvent({ eventType: `security_review_${body.status}`, actorType: "admin", actorEmail: auth.email, request, resourceType: "security_review", resourceId: body.reviewId, metadata: { restrictionType: body.restrictionType || null } })
      return NextResponse.json({ success: true })
    }
    if (body?.action === "release-restriction" && typeof body.restrictionId === "string") {
      await execute("UPDATE account_restrictions SET status = 'released', released_by = $1, released_at = NOW() WHERE id = $2 AND status = 'active'", [auth.email, body.restrictionId])
      await recordSecurityEvent({ eventType: "account_restriction_released", actorType: "admin", actorEmail: auth.email, request, resourceType: "account_restriction", resourceId: body.restrictionId })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: "Unsupported security operation" }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save security operation" }, { status: 500 })
  }
}
