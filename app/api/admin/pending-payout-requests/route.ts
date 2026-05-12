import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const sp = request.nextUrl.searchParams
    const amount = sp.get("amount")

    const params: any[] = []
    let amountFilter = ""
    if (amount) {
      params.push(Number(amount))
      amountFilter = ` AND pr.amount = $${params.length}`
    }

    const rows = await query(
      `SELECT
        pr.id,
        pr.participant_email,
        pr.amount,
        pr.status,
        pr.payout_method,
        pr.wallet_address,
        pr.redirect_to_email,
        pr.created_at,
        p.full_name,
        p.username,
        p.mobile_number,
        p.bep20_address,
        p.serial_number AS participant_serial
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.status IN ('pending', 'matched')
      ${amountFilter}
      ORDER BY pr.created_at ASC`,
      params
    )

    return NextResponse.json({
      success: true,
      payouts: rows.map((r: any) => ({
        id: r.id,
        participant_email: r.participant_email,
        amount: Number(r.amount),
        status: r.status,
        serial_number: r.participant_serial,
        payout_method: r.payout_method,
        wallet_address: r.wallet_address,
        redirect_to_email: r.redirect_to_email,
        created_at: r.created_at,
        full_name: r.full_name || r.username || "Unknown",
        mobile_number: r.mobile_number || null,
        bep20_address: r.bep20_address || r.wallet_address || null,
        participant_serial: r.participant_serial,
      })),
    })
  } catch (err) {
    console.error("[pending-payout-requests] GET error:", err)
    return NextResponse.json({ success: false, error: "Failed to fetch payout requests" }, { status: 500 })
  }
}
