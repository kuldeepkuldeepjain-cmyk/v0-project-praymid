import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })
    await execute(
      `UPDATE participants SET account_frozen = true, status = $1 WHERE email = $2`,
      ['frozen', email]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
