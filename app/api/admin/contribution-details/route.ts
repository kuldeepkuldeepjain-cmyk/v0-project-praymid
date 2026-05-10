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

    // Fetch from contribution_ledger for accurate matching
    const ledgerRes = await db.query(
      `SELECT id, participant_id, payment_id, payout_id, payment_amount, payout_amount, match_status, created_at 
       FROM contribution_ledger WHERE participant_email=$1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    const ledgerData = ledgerRes.rows[0]
    if (!ledgerData) {
      return NextResponse.json({ success: true, contributionData: null })
    }

    const targetParticipantId = ledgerData.participant_id

    const partRes = await db.query(
      `SELECT id, full_name, mobile_number, wallet_address, email FROM participants WHERE id=$1`,
      [targetParticipantId]
    )
    const walletRes = await db.query(
      `SELECT wallet_address FROM wallet_pool WHERE assigned_to=$1 LIMIT 1`,
      [targetParticipantId]
    )

    return NextResponse.json({
      success: true,
      contributionData: {
        id: ledgerData.id,
        ledger_id: ledgerData.id,
        payment_id: ledgerData.payment_id,
        payout_id: ledgerData.payout_id,
        payment_amount: parseFloat(ledgerData.payment_amount),
        payout_amount: parseFloat(ledgerData.payout_amount),
        match_status: ledgerData.match_status,
        is_matched: ledgerData.match_status === 'matched',
        difference: Math.abs(parseFloat(ledgerData.payment_amount) - parseFloat(ledgerData.payout_amount)),
        created_at: ledgerData.created_at,
        participant_email: email,
        participants: partRes.rows[0] || null,
        wallet_pool: walletRes.rows[0] || { wallet_address: null },
      },
    })
  } catch (error) {
    console.error("[v0] Contribution details error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
