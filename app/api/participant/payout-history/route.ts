import { NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const rows = await query(
      `SELECT * FROM payout_requests
       WHERE participant_email = $1
       ORDER BY created_at DESC`,
      [email]
    )
    return NextResponse.json({ success: true, payouts: rows })
  } catch (error: any) {
    console.error("payout-history error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
