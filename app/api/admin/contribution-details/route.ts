import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const [approved, payout] = await Promise.all([
      sql`
        SELECT id, amount, status, created_at, participant_email, participant_id
        FROM payment_submissions
        WHERE participant_email = ${email} AND status = 'approved'
        ORDER BY created_at DESC LIMIT 1
      `,
      sql`
        SELECT id, amount, participant_email, participant_id, status, created_at
        FROM payout_requests
        WHERE participant_email = ${email} AND status IN ('pending','processing','approved')
        ORDER BY created_at DESC LIMIT 1
      `,
    ])

    const targetParticipantId = approved[0]?.participant_id || payout[0]?.participant_id
    if (!targetParticipantId) {
      return NextResponse.json({ success: true, contribution: null })
    }

    const [participant, wallet] = await Promise.all([
      sql`
        SELECT id, full_name, mobile_number, wallet_address, email
        FROM participants WHERE id = ${targetParticipantId}
      `,
      sql`
        SELECT wallet_address FROM wallet_pool
        WHERE assigned_to = ${targetParticipantId} LIMIT 1
      `,
    ])

    if (!participant[0]) {
      return NextResponse.json({ success: true, contribution: null })
    }

    return NextResponse.json({
      success: true,
      contribution: {
        id: approved[0]?.id || payout[0]?.id,
        amount: approved[0]?.amount || payout[0]?.amount || 100,
        status: approved[0] ? "approved" : "matched_payout",
        created_at: approved[0]?.created_at || payout[0]?.created_at,
        participants: participant[0],
        wallet_pool: wallet[0] || { wallet_address: null },
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
