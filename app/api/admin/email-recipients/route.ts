import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query<{ id: string; full_name: string | null; username: string | null; email: string }>(
      "SELECT id, full_name, username, email FROM participants WHERE is_deleted IS NOT TRUE AND email IS NOT NULL ORDER BY LOWER(COALESCE(full_name, email)), LOWER(email) LIMIT 500",
    )
    return NextResponse.json({ success: true, recipients: rows.filter(row => row.email).map(row => ({ id: row.id, name: row.full_name || row.username || row.email, email: row.email })) })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to load participant recipients." }, { status: 500 })
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
