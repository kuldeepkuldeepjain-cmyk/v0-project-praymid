import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, bep20_address } = await request.json()

    if (!email || !bep20_address) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    if (!/^0x[a-fA-F0-9]{40}$/.test(bep20_address)) {
      return NextResponse.json({ error: "Invalid BEP20 address format" }, { status: 400 })
    }

    const [updated] = await sql`
      UPDATE participants SET wallet_address=${bep20_address}, bep20_address=${bep20_address}, updated_at=NOW()
      WHERE email=${email}
      RETURNING *
    `

    if (!updated) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({ success: true, message: "BEP20 address updated successfully", data: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
