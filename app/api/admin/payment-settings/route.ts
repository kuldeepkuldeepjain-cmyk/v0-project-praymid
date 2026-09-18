import { NextRequest, NextResponse } from "next/server"
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

    const adminEmail = auth.email
    await query(
      `INSERT INTO admin_wallet_addresses (network, address, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW()), ($4, $5, $3, NOW())
       ON CONFLICT (network) DO UPDATE
       SET address = EXCLUDED.address, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      ["TRC20", trc20Address, adminEmail, "ERC20", erc20Address],
    )
    await query(
      `INSERT INTO system_settings(setting_key, setting_value, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [legacyBep20Key, bep20Address],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to save payment settings:", error)
    return NextResponse.json({ success: false, error: "Unable to save payment settings" }, { status: 500 })
  }
}
