import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })

    const rows = await sql`
      SELECT * FROM payout_requests
      WHERE participant_email = ${email}
      ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, payouts: rows })
  } catch (error: any) {
    console.error("payout-history error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
