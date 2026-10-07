import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT
         pr.*,
         p.full_name,
         p.email AS p_email,
         p.serial_number AS p_serial
       FROM payout_requests pr
       LEFT JOIN participants p ON p.id = pr.participant_id
       ORDER BY pr.created_at DESC`
    )
    const payouts = rows.map((row) => ({
      id: row.id,
      participant_id: row.participant_id,
      participant_email: row.participant_email,
      participant_name: row.full_name || "Unknown",
      serial_number: row.serial_number,
      amount: Number(row.amount),
      wallet_address: row.wallet_address,
      status: row.status,
      created_at: row.created_at,
    }))
    return NextResponse.json({ success: true, payouts })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
