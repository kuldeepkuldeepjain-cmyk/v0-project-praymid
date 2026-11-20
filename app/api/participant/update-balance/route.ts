import { NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { email, balance } = await req.json()
    if (typeof email !== "string" || !email.trim() || typeof balance !== "number" || !Number.isFinite(balance) || balance < 0) {
      return NextResponse.json({ success: false, error: "Invalid balance or email" }, { status: 400 })
    }
    const updated = await execute(
      `UPDATE participants SET account_balance = $1, updated_at = NOW()
       WHERE LOWER(email) = LOWER($2) AND account_type IS DISTINCT FROM 'challenge'
         AND NOT (account_type IS NOT DISTINCT FROM 'funded' AND funded_breach_status = 'breached')`,
      [balance, email.trim()],
    )
    if (!updated) return NextResponse.json({ success: false, error: "Account not found or balance is locked" }, { status: 409 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to update balance" }, { status: 500 })
  }
}
