import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`
      SELECT setting_key, setting_value, updated_at
      FROM system_settings
      WHERE setting_key IN ('p2p_mode_enabled', 'admin_wallet_address')
    `
    const map: Record<string, any> = {}
    for (const r of rows) map[r.setting_key] = r

    return NextResponse.json({
      success: true,
      settings: {
        p2p_mode_enabled: map["p2p_mode_enabled"]?.setting_value === "true",
        admin_wallet_address: map["admin_wallet_address"]?.setting_value || "",
        last_updated: map["p2p_mode_enabled"]?.updated_at || new Date().toISOString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json()
    await sql`
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
