import { NextResponse } from "next/server"
import { query } from "@/lib/db"

const keys = ["topup_trc20_address", "topup_bep20_address"] as const

export async function GET() {
  try {
    const rows = (await query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1::text[])`,
      [keys],
    )) as Array<{ setting_key: string; setting_value: string }>
    const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value || ""]))
    return NextResponse.json({
      success: true,
      trc20_address: settings.topup_trc20_address || "",
      bep20_address: settings.topup_bep20_address || "",
    })
  } catch (error) {
    console.error("[v0] Failed to load payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to load payment settings" }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const trc20Address = typeof body.trc20_address === "string" ? body.trc20_address.trim() : ""
    const bep20Address = typeof body.bep20_address === "string" ? body.bep20_address.trim() : ""

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW()), ($3, $4, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      ["topup_trc20_address", trc20Address, "topup_bep20_address", bep20Address],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to save payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to save payment settings" }, { status: 500 })
  }
}
