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
    const events = await query(
      `SELECT id, actor_id, actor_email, action, target_type, target_id, details, created_at
       FROM activity_logs
       WHERE ($1 = '' OR LOWER(actor_email) LIKE '%' || $1 || '%' OR LOWER(COALESCE(details, '')) LIKE '%' || $1 || '%' OR LOWER(action) LIKE '%' || $1 || '%')
       ORDER BY created_at DESC, id DESC LIMIT $2`,
      [search, limit],
    )
    return NextResponse.json({ success: true, events, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("[v0] Admin activity monitor error:", error)
    return NextResponse.json({ success: false, error: "Unable to load participant activity" }, { status: 500 })
  }
}
