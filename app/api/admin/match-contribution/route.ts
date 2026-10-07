import { execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { contributionId, payoutId } = await req.json()
    if (!contributionId || !payoutId) {
      return NextResponse.json({ success: false, error: "Contribution and payout IDs are required" }, { status: 400 })
    }

    await Promise.all([
      execute(
        `UPDATE payment_submissions
         SET matched_payout_id = $1, status = 'in_process'
         WHERE id = $2`,
        [payoutId, contributionId]
      ),
      execute(
        `UPDATE payout_requests
         SET matched_contribution_id = $1
         WHERE id = $2`,
        [contributionId, payoutId]
      ),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
