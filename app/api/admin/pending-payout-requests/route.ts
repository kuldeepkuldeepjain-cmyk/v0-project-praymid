import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const sp = request.nextUrl.searchParams
    const amount = sp.get("amount") // optional filter by amount

    let sql = `
      SELECT
        pr.id,
        pr.participant_email,
        pr.amount,
        pr.status,
        pr.serial_number,
        pr.payout_method,
        pr.redirect_to_email,
        pr.redirect_to_serial,
        pr.created_at,
        p.full_name,
        p.username,
        p.mobile_number,
        p.bep20_address,
        p.wallet_address,
        p.serial_number AS participant_serial
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.status IN ('pending', 'matched')
    `
    const params: any[] = []
    if (amount) {
      params.push(Number(amount))
      sql += ` AND pr.amount = $${params.length}`
    }
    sql += ` ORDER BY pr.created_at ASC`

    const { rows } = await db.query(sql, params)

    return NextResponse.json({
      success: true,
      payouts: rows.map((r: any) => ({
        id: r.id,
        participant_email: r.participant_email,
        amount: Number(r.amount),
        status: r.status,
        serial_number: r.serial_number,
        payout_method: r.payout_method,
        redirect_to_email: r.redirect_to_email,
        redirect_to_serial: r.redirect_to_serial,
        created_at: r.created_at,
        full_name: r.full_name || r.username || "Unknown",
        mobile_number: r.mobile_number || "N/A",
        bep20_address: r.bep20_address || r.wallet_address || null,
        participant_serial: r.participant_serial,
      })),
    })
  } catch (err: any) {
    console.error("[pending-payout-requests] error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
