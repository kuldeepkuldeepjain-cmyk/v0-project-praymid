import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const status = request.nextUrl.searchParams.get("status") || ""
    const params: string[] = []
    const statusFilter = status ? (params.push(status), `AND pr.status = $${params.length}`) : ""

    const rows = await query(
      `SELECT pr.id, pr.participant_email, pr.amount, pr.status,
              pr.payout_method, pr.wallet_address, pr.transaction_hash,
              pr.redirect_to_email, pr.redirect_to_serial, pr.admin_notes,
              pr.created_at, pr.updated_at, pr.processed_at,
              pr.wallet_balance_before, pr.wallet_balance_after,
              p.full_name, p.username, p.serial_number, p.mobile_number,
              p.account_balance
       FROM payout_requests pr
       LEFT JOIN participants p ON LOWER(p.email) = LOWER(pr.participant_email)
       WHERE 1 = 1 ${statusFilter}
       ORDER BY pr.created_at DESC`,
      params,
    )

    const payouts = rows.map((r: any) => ({
      id: r.id,
      serial_number: r.serial_number || "—",
      participant_email: r.participant_email || "",
      amount: Number(r.amount) || 0,
      status: r.status || "pending",
      payout_method: r.payout_method || "BEP20",
      wallet_address: r.wallet_address || "",
      transaction_hash: r.transaction_hash || "",
      redirect_to_email: r.redirect_to_email || "",
      redirect_to_serial: r.redirect_to_serial || "",
      admin_notes: r.admin_notes || "",
      created_at: r.created_at,
      updated_at: r.updated_at,
      processed_at: r.processed_at,
      wallet_balance_before: Number(r.wallet_balance_before) || 0,
      wallet_balance_after: Number(r.wallet_balance_after) || 0,
      full_name: r.full_name || r.username || "Unknown",
      mobile_number: r.mobile_number || "",
      account_balance: Number(r.account_balance) || 0,
    }))

    return NextResponse.json({ success: true, payouts, totalCount: payouts.length })
  } catch (error) {
    console.error("[v0] Error fetching payout records:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch payout records" }, { status: 500 })
  }
}
