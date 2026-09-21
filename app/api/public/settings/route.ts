import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// Public endpoint — no auth required
// Returns only safe, participant-facing settings (wallet address etc.)
export async function GET() {
  try {
    const rows = await query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('topup_trc20_address','topup_bep20_address','topup_erc20_address','topup_address','bep20_address','usdt_address','topup_inr_bank_name','topup_inr_account_number','topup_inr_ifsc_code','topup_inr_account_holder_name')`
    ) as any[]

  const settings: Record<string, string> = {}
  rows.forEach((r) => { settings[r.setting_key] = r.setting_value })

  const trc20Address = settings.topup_trc20_address || null
  const erc20Address = settings.topup_erc20_address || null
  const bep20Address = settings.topup_bep20_address || settings.topup_address || settings.bep20_address || settings.usdt_address || null

  return NextResponse.json({
    success: true,
    topup_address: bep20Address,
    trc20_address: trc20Address,
    bep20_address: bep20Address,
    erc20_address: erc20Address,
    inr_bank_name: settings.topup_inr_bank_name || null,
    inr_account_number: settings.topup_inr_account_number || null,
    inr_ifsc_code: settings.topup_inr_ifsc_code || null,
    inr_account_holder_name: settings.topup_inr_account_holder_name || null,
  })

  } catch {
    return NextResponse.json({ success: false, topup_address: null })
  }
}
