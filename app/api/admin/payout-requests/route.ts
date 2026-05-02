import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        pr.*,
        p.full_name,
        p.email AS p_email,
        p.serial_number AS p_serial
      FROM payout_requests pr
      LEFT JOIN participants p ON p.id = pr.participant_id
      ORDER BY pr.created_at DESC
    `
    const payouts = rows.map((r: any) => ({
      id: r.id,
      participant_id: r.participant_id,
      participant_email: r.participant_email,
      participant_name: r.full_name || "Unknown",
      serial_number: r.serial_number,
      amount: Number(r.amount),
      wallet_address: r.wallet_address,
      status: r.status,
      created_at: r.created_at,
    }))
    return NextResponse.json({ success: true, payouts })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
