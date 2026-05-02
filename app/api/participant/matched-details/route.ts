import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contributionId = searchParams.get("contributionId")
    const email = searchParams.get("email")

    if (!contributionId || !email) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 })
    }

    const contributions = await sql`
      SELECT id, amount, status, created_at, matched_payout_id
      FROM payment_submissions
      WHERE id = ${contributionId} AND participant_email = ${email}
      LIMIT 1
    `
    const contribution = contributions[0]
    if (!contribution) return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })
    if (!contribution.matched_payout_id) return NextResponse.json({ success: false, error: "Not matched yet" }, { status: 404 })

    const payouts = await sql`
      SELECT pr.id, pr.participant_email, pr.amount, pr.status, pr.created_at,
             pr.wallet_address, pr.serial_number,
             p.full_name, p.username, p.mobile_number, p.bep20_address
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.id = ${contribution.matched_payout_id}
      LIMIT 1
    `
    const payout = payouts[0]
    if (!payout) return NextResponse.json({ success: false, error: "Payout not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      matched: {
        contribution: {
          id: contribution.id,
          amount: contribution.amount,
          status: contribution.status,
          created_at: contribution.created_at,
          matched_at: contribution.created_at,
        },
        payout: {
          id: payout.id,
          participant_email: payout.participant_email,
          participant_name: payout.full_name || payout.username || "Unknown",
          amount: payout.amount,
          payout_method: "USDT BEP20",
          wallet_address: payout.bep20_address || payout.wallet_address,
          status: payout.status,
          created_at: payout.created_at,
          serial_number: payout.serial_number,
          participants: {
            full_name: payout.full_name,
            email: payout.participant_email,
            mobile_number: payout.mobile_number,
            bep20_address: payout.bep20_address,
            wallet_address: payout.wallet_address,
          },
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
