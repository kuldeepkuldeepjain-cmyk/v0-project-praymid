import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const [participants, transactions, contributions, payouts] = await Promise.all([
      sql`SELECT id, email, full_name, username, account_balance FROM participants WHERE email = ${email} LIMIT 1`,
      sql`SELECT * FROM transactions WHERE participant_email = ${email} ORDER BY created_at DESC`,
      sql`SELECT id, amount, status, created_at FROM payment_submissions WHERE participant_email = ${email} ORDER BY created_at DESC`,
      sql`SELECT id, amount, status, created_at FROM payout_requests WHERE participant_email = ${email} ORDER BY created_at DESC`,
    ])

    if (!participants[0]) {
      return NextResponse.json({ success: false, error: "Participant not found" })
    }

    return NextResponse.json({
      success: true,
      participant: participants[0],
      transactions,
      contributions,
      payouts,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
