import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"
import { isChallengeAccount } from "@/lib/challenge-account-server"

export async function POST(req: NextRequest) {
  try {
    const { email, balance } = await req.json()
    if (!email || balance === undefined) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 })
    if (await isChallengeAccount(email)) return NextResponse.json({ success: false, error: "Challenge balances can only change through verified trades." }, { status: 403 })
    await execute(
      `UPDATE participants SET account_balance = $1 WHERE email = $2`,
      [balance, email]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
