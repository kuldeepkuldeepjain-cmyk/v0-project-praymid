import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// Public endpoint — no auth required
// Returns only safe, participant-facing settings (wallet address etc.)
export async function GET() {
  try {
    const rows = await query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('topup_address','bep20_address','usdt_address')`
    ) as any[]

    const settings: Record<string, string> = {}
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value })

    return NextResponse.json({
      success: true,
      topup_address: settings.topup_address || settings.bep20_address || settings.usdt_address || null,
    })
  } catch {
    return NextResponse.json({ success: false, topup_address: null })
  }
}
