import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getServiceClient()
    const res = await db.query(`SELECT setting_key, setting_value FROM system_settings`)
    const settings: Record<string, string> = {}
    res.rows.forEach((row: any) => { settings[row.setting_key] = row.setting_value })
    return NextResponse.json({ success: true, ...settings })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getServiceClient()
    const body = await request.json()
    for (const [key, value] of Object.entries(body)) {
      await db.query(
        `INSERT INTO system_settings(setting_key,setting_value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=$2, updated_at=NOW()`,
        [key, value]
      )
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save settings" }, { status: 500 })
  }
}
