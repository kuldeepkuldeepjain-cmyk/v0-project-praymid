import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const [contributions, payouts] = await Promise.all([
      query(
        `SELECT
           ps.id, ps.participant_email, ps.amount,
           ps.transaction_id, ps.screenshot_url, ps.status, ps.created_at,
           p.full_name, p.username
         FROM payment_submissions ps
         LEFT JOIN participants p ON p.email = ps.participant_email
         ORDER BY ps.created_at DESC`
      ),
      query(
        `SELECT
           pr.id, pr.participant_email, pr.amount,
           pr.wallet_address, pr.status, pr.serial_number, pr.created_at,
           p.full_name, p.username
         FROM payout_requests pr
         LEFT JOIN participants p ON p.email = pr.participant_email
         ORDER BY pr.created_at DESC`
      ),
    ])

    return NextResponse.json({ success: true, contributions, payouts })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
