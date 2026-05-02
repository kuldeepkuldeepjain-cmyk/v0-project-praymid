import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email, balance } = await req.json()
    if (!email || balance === undefined) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 })
    await sql`UPDATE participants SET account_balance = ${balance} WHERE email = ${email}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
