import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const legacyBep20Key = "topup_bep20_address"
const inrBankSettingKeys = ["topup_inr_bank_name", "topup_inr_ifsc_code", "topup_inr_account_holder_name"] as const

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const rows = (await query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('topup_trc20_address', 'topup_erc20_address', $1, $2, $3, $4)`,
      [legacyBep20Key, ...inrBankSettingKeys],
    )) as Array<{ setting_key: string; setting_value: string | null }>
    const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value || ""]))
    return NextResponse.json({
      success: true,
      trc20_address: settings.topup_trc20_address || "",
      bep20_address: settings[legacyBep20Key] || "",
      erc20_address: settings.topup_erc20_address || "",
      inr_bank_name: settings.topup_inr_bank_name || "",
      inr_ifsc_code: settings.topup_inr_ifsc_code || "",
      inr_account_holder_name: settings.topup_inr_account_holder_name || "",
    })
  } catch (error) {
    console.error("[v0] Failed to load payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to load payment settings" }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const trc20Address = typeof body.trc20_address === "string" ? body.trc20_address.trim() : ""
    const bep20Address = typeof body.bep20_address === "string" ? body.bep20_address.trim() : ""
    const erc20Address = typeof body.erc20_address === "string" ? body.erc20_address.trim() : ""
    const inrBankName = typeof body.inr_bank_name === "string" ? body.inr_bank_name.trim() : ""
    const inrIfscCode = typeof body.inr_ifsc_code === "string" ? body.inr_ifsc_code.trim().toUpperCase() : ""
    const inrAccountHolderName = typeof body.inr_account_holder_name === "string" ? body.inr_account_holder_name.trim() : ""

    // Keep all deposit addresses in system_settings, which is present in every
    // supported database setup. This avoids making the save depend on the
    // optional admin_wallet_addresses migration being present in production.
    await query(
      `INSERT INTO system_settings(id, setting_key, setting_value, updated_at)
       VALUES
         ($1, $2, $3, NOW()),
         ($4, $5, $6, NOW()),
         ($7, $8, $9, NOW()),
         ($10, $11, $12, NOW()),
         ($13, $14, $15, NOW()),
         ($16, $17, $18, NOW())
       ON CONFLICT(setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [
        randomUUID(), "topup_trc20_address", trc20Address,
        randomUUID(), "topup_erc20_address", erc20Address,
        randomUUID(), legacyBep20Key, bep20Address,
        randomUUID(), "topup_inr_bank_name", inrBankName,
        randomUUID(), "topup_inr_ifsc_code", inrIfscCode,
        randomUUID(), "topup_inr_account_holder_name", inrAccountHolderName,
      ],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to save payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to save payment settings" }, { status: 500 })
  }
}
