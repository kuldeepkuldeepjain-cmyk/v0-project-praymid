import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const db = getPool()!

    const approvedRes = await db.query(
      `SELECT id,amount,status,created_at,participant_email,participant_id FROM payment_submissions WHERE participant_email=$1 AND status='approved' ORDER BY created_at DESC LIMIT 1`,
      [email]
    )
    const payoutRes = await db.query(
      `SELECT id,amount,participant_email,participant_id,status,created_at FROM payout_requests WHERE participant_email=$1 AND status IN ('pending','processing','approved') ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    const approvedData = approvedRes[0]
    const payoutData = payoutRes[0]
    const targetParticipantId = approvedData?.participant_id || payoutData?.participant_id

    if (!targetParticipantId) {
      return NextResponse.json({ success: true, contributionData: null })
    }

    const partRes = await db.query(
      `SELECT id,full_name,mobile_number,wallet_address,email FROM participants WHERE id=$1`,
      [targetParticipantId]
    )
    const walletRes = await db.query(
      `SELECT wallet_address FROM wallet_pool WHERE assigned_to=$1 LIMIT 1`,
      [targetParticipantId]
    )

    return NextResponse.json({
      success: true,
      contributionData: {
        id: approvedData?.id || payoutData?.id,
        amount: approvedData?.amount || payoutData?.amount || 100,
        status: approvedData ? "approved" : "matched_payout",
        created_at: approvedData?.created_at || payoutData?.created_at,
        participants: partRes[0] || null,
        wallet_pool: walletRes[0] || { wallet_address: null },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
