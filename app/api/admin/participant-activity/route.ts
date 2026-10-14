import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase() || ""
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 300), 25), 500)
    const [events, participants] = await Promise.all([
      query(`SELECT id, actor_id, actor_email, action, target_type, target_id, details, created_at FROM activity_logs WHERE ($1 = '' OR LOWER(actor_email) LIKE '%' || $1 || '%' OR LOWER(COALESCE(details, '')) LIKE '%' || $1 || '%' OR LOWER(action) LIKE '%' || $1 || '%') ORDER BY created_at DESC, id DESC LIMIT $2`, [search, limit]),
      query(`SELECT p.id, p.email, p.username, p.last_seen, p.status, p.is_active,
        (SELECT ps.last_activity FROM participant_sessions ps WHERE ps.participant_id = p.id AND ps.is_active = TRUE ORDER BY ps.last_activity DESC NULLS LAST LIMIT 1) AS session_last_activity,
        (SELECT ps.ip_address::text FROM participant_sessions ps WHERE ps.participant_id = p.id AND ps.is_active = TRUE ORDER BY ps.last_activity DESC NULLS LAST LIMIT 1) AS session_ip
        FROM participants p
        WHERE ($1 = '' OR LOWER(p.email) LIKE '%' || $1 || '%' OR LOWER(COALESCE(p.username, '')) LIKE '%' || $1 || '%')
        ORDER BY COALESCE(p.last_seen, p.created_at) DESC LIMIT 300`, [search]),
    ])
    const now = Date.now()
    const sessionRows = participants.map((participant: any) => ({
      ...participant,
      active_now: Boolean(participant.session_last_activity && now - new Date(participant.session_last_activity).getTime() < 5 * 60 * 1000),
    }))
    return NextResponse.json({ success: true, events, participants: sessionRows, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("[v0] Admin activity monitor error:", error)
    return NextResponse.json({ success: false, error: "Unable to load participant activity" }, { status: 500 })
  }
}
