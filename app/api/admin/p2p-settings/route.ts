import { execute, query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const rows = await query<{ setting_key: string; setting_value: string; updated_at: string }>(
      `SELECT setting_key, setting_value, updated_at
       FROM system_settings
       WHERE setting_key IN ('p2p_mode_enabled', 'admin_wallet_address')`
    )
    const map = Object.fromEntries(rows.map((row) => [row.setting_key, row]))

    return NextResponse.json({
      success: true,
      settings: {
        p2p_mode_enabled: map.p2p_mode_enabled?.setting_value === "true",
        admin_wallet_address: map.admin_wallet_address?.setting_value || "",
        last_updated: map.p2p_mode_enabled?.updated_at || new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { key, value } = await req.json()
    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Setting key and value are required" }, { status: 400 })
    }
    await execute(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [key, value]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
