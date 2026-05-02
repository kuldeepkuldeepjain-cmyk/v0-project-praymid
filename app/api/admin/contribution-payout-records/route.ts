import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const [contributions, payouts] = await Promise.all([
      sql`
        SELECT
          ps.id, ps.participant_email, ps.amount,
          ps.transaction_id, ps.screenshot_url, ps.status, ps.created_at,
          p.full_name, p.username
        FROM payment_submissions ps
        LEFT JOIN participants p ON p.email = ps.participant_email
        ORDER BY ps.created_at DESC
      `,
      sql`
        SELECT
          pr.id, pr.participant_email, pr.amount,
          pr.wallet_address, pr.status, pr.serial_number, pr.created_at,
          p.full_name, p.username
        FROM payout_requests pr
        LEFT JOIN participants p ON p.email = pr.participant_email
        ORDER BY pr.created_at DESC
      `,
    ])

    return NextResponse.json({ success: true, contributions, payouts })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
