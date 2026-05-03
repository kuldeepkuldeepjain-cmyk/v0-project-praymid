import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const { contributionId, payoutId } = await req.json()
    await Promise.all([
      sql`
        UPDATE payment_submissions
        SET matched_payout_id = ${payoutId}, status = 'in_process'
        WHERE id = ${contributionId}
      `,
      sql`
        UPDATE payout_requests
        SET matched_contribution_id = ${contributionId}
        WHERE id = ${payoutId}
      `,
    ])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
