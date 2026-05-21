import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const status = sp.get("status") || ""

    const params: any[] = []
    let statusFilter = ""

    if (status) {
      params.push(status)
      statusFilter = `AND pr.status = $${params.length}`
    }

    const rows = await query(
      `SELECT
        pr.id,
        pr.serial_number,
        pr.participant_email,
        pr.amount,
        pr.status,
        pr.payout_method,
        pr.wallet_address,
        pr.redirect_to_email,
        pr.redirect_to_serial,
        pr.admin_notes,
        pr.created_at,
        pr.updated_at,
        p.full_name,
        p.username,
        p.mobile_number,
        p.account_balance
      FROM payout_requests pr
      LEFT JOIN participants p ON LOWER(p.email) = LOWER(pr.participant_email)
      WHERE 1=1 ${statusFilter}
      ORDER BY pr.created_at DESC`,
      params
    )

    const payouts = (rows || []).map((r: any) => ({
      id: r.id,
      serial_number: r.serial_number || "—",
      participant_email: r.participant_email || "",
      amount: Number(r.amount) || 0,
      status: r.status || "pending",
      payout_method: r.payout_method || "BEP20",
      wallet_address: r.wallet_address || "",
      redirect_to_email: r.redirect_to_email || "",
      redirect_to_serial: r.redirect_to_serial || "",
      admin_notes: r.admin_notes || "",
      created_at: r.created_at,
      updated_at: r.updated_at,
      full_name: r.full_name || r.username || "Unknown",
      mobile_number: r.mobile_number || "",
      account_balance: Number(r.account_balance) || 0,
    }))

    return NextResponse.json({ success: true, payouts, totalCount: payouts.length })
  } catch (err) {
    console.error("[all-payouts] GET error:", err)
    return NextResponse.json({ success: false, error: "Failed to fetch payout records" }, { status: 500 })
  }
}
