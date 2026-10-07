import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const payouts = await query(
      `SELECT
         pr.*,
         p.full_name, p.email AS p_email, p.mobile_number,
         p.wallet_address, p.bep20_address
       FROM payout_requests pr
       LEFT JOIN participants p ON p.email = pr.participant_email
       WHERE pr.status IN ('pending', 'request_pending')
         AND pr.matched_contribution_id IS NULL
       ORDER BY pr.created_at DESC`
    )
    return NextResponse.json({ success: true, payouts })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
