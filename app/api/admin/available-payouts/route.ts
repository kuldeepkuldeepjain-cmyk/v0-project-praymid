import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        pr.*,
        p.full_name, p.email AS p_email, p.mobile_number,
        p.wallet_address, p.bep20_address
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.status IN ('pending', 'request_pending')
        AND pr.matched_contribution_id IS NULL
      ORDER BY pr.created_at DESC
    `
    return NextResponse.json({ success: true, payouts: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
