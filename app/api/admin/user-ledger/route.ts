import { query, queryOne } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")?.trim()
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const [participant, transactions, contributions, payouts] = await Promise.all([
      queryOne(
        "SELECT id, email, full_name, username, account_balance FROM participants WHERE email = $1 LIMIT 1",
        [email]
      ),
      query("SELECT * FROM transactions WHERE participant_email = $1 ORDER BY created_at DESC", [email]),
      query("SELECT id, amount, status, created_at FROM payment_submissions WHERE participant_email = $1 ORDER BY created_at DESC", [email]),
      query("SELECT id, amount, status, created_at FROM payout_requests WHERE participant_email = $1 ORDER BY created_at DESC", [email]),
    ])

    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, participant, transactions, contributions, payouts })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
