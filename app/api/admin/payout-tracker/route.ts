import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const flows = await sql`
      SELECT
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
      ORDER BY pr.created_at DESC
    `
    const result = flows.map((r: any) => ({
      payout_id: r.payout_id,
      payout_requester_email: r.payout_requester_email,
      payout_requester_name: r.requester_name || r.requester_username || "N/A",
      payout_requester_serial: r.payout_requester_serial || "N/A",
      payout_amount: Number(r.payout_amount),
      payout_status: r.payout_status,
      payout_created_at: r.payout_created_at,
      contributor_email: r.contributor_email || "N/A",
      contributor_name: r.contributor_name || r.contributor_username || "N/A",
      contributor_serial: r.contributor_serial || "N/A",
      contribution_amount: 100,
      wallet_address: r.requester_wallet || "N/A",
    }))
    return NextResponse.json({ success: true, flows: result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
