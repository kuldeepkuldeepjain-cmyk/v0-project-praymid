import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const rows = await sql`SELECT setting_key, setting_value FROM system_settings`
    const settings: Record<string, string> = {}
    rows.forEach((r: any) => { settings[r.setting_key] = r.setting_value })
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES (${key}, ${value as string}, NOW())
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      `
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
