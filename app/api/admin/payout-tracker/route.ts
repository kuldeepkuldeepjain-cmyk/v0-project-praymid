import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const flows = await query(
      `SELECT
         pr.id AS payout_id,
         pr.participant_email AS payout_requester_email,
         pr.serial_number AS payout_requester_serial,
         pr.amount AS payout_amount,
         pr.status AS payout_status,
         pr.created_at AS payout_created_at,
         pr.redirect_to_serial,
         pr.redirect_to_email,
         req.full_name AS requester_name,
         req.username AS requester_username,
         req.wallet_address AS requester_wallet,
         con.email AS contributor_email,
         con.full_name AS contributor_name,
         con.username AS contributor_username,
         con.serial_number AS contributor_serial
       FROM payout_requests pr
       LEFT JOIN participants req ON req.email = pr.participant_email
       LEFT JOIN participants con ON
         (pr.redirect_to_serial IS NOT NULL AND con.serial_number = pr.redirect_to_serial)
         OR (pr.redirect_to_serial IS NULL AND pr.redirect_to_email IS NOT NULL AND con.email = pr.redirect_to_email)
       WHERE pr.status = 'redirected'
       ORDER BY pr.created_at DESC`
    )
    const result = flows.map((row) => ({
      payout_id: row.payout_id,
      payout_requester_email: row.payout_requester_email,
      payout_requester_name: row.requester_name || row.requester_username || "N/A",
      payout_requester_serial: row.payout_requester_serial || "N/A",
      payout_amount: Number(row.payout_amount),
      payout_status: row.payout_status,
      payout_created_at: row.payout_created_at,
      contributor_email: row.contributor_email || "N/A",
      contributor_name: row.contributor_name || row.contributor_username || "N/A",
      contributor_serial: row.contributor_serial || "N/A",
      contribution_amount: Number(row.payout_amount) || 0,
      wallet_address: row.requester_wallet || "N/A",
    }))
    return NextResponse.json({ success: true, flows: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
