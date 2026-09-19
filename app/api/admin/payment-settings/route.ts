import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const legacyBep20Key = "topup_bep20_address"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const walletRows = (await query(
      `SELECT network, address FROM admin_wallet_addresses WHERE network IN ('TRC20', 'ERC20')`,
    )) as Array<{ network: "TRC20" | "ERC20"; address: string }>
    const bep20Rows = (await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1`,
      [legacyBep20Key],
    )) as Array<{ setting_value: string | null }>
    const wallets = Object.fromEntries(walletRows.map((row) => [row.network, row.address || ""]))
    return NextResponse.json({
      success: true,
      trc20_address: wallets.TRC20 || "",
      bep20_address: bep20Rows[0]?.setting_value || "",
      erc20_address: wallets.ERC20 || "",
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

    // Keep all deposit addresses in system_settings, which is present in every
    // supported database setup. This avoids making the save depend on the
    // optional admin_wallet_addresses migration being present in production.
    await query(
      `INSERT INTO system_settings(id, setting_key, setting_value, updated_at)
       VALUES
         ($1, $2, $3, NOW()),
         ($4, $5, $6, NOW()),
         ($7, $8, $9, NOW())
       ON CONFLICT(setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [
        randomUUID(), "topup_trc20_address", trc20Address,
        randomUUID(), "topup_erc20_address", erc20Address,
        randomUUID(), legacyBep20Key, bep20Address,
      ],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to save payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to save payment settings" }, { status: 500 })
  }
}
