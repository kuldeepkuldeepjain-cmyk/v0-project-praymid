import { NextRequest, NextResponse } from "next/server"
import { execute, query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })
    if (auth.email.toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const participants = await query(
      "SELECT account_type FROM participants WHERE email = $1 LIMIT 1",
      [email],
    ) as Array<{ account_type?: string }>
    if (participants[0]?.account_type === "funded") {
      return NextResponse.json({ success: true, skipped: true, reason: "Funded accounts do not use freeze conditions" })
    }

    await execute(
      `UPDATE participants SET account_frozen = true, is_frozen = true, status = $1, updated_at = NOW() WHERE email = $2`,
      ["frozen", email]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
