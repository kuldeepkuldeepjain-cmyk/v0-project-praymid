import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, full_name, wallet_address, full_address } = await request.json()

    if (!email || !full_name || !wallet_address || !full_address) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (!wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: "Invalid BEP20 wallet address format" }, { status: 400 })
    }

    // Check if wallet already used by another account
    const [existingWallet] = await sql`
      SELECT email FROM participants WHERE wallet_address=${wallet_address} AND email != ${email}
    `
    if (existingWallet) {
      return NextResponse.json({ error: "This wallet address is already registered to another account" }, { status: 400 })
    }

    const [updated] = await sql`
      UPDATE participants SET
        full_name       = ${full_name},
        wallet_address  = ${wallet_address},
        bep20_address   = ${wallet_address},
        full_address    = ${full_address},
        details_completed = true,
        username        = ${full_name.split(" ")[0].toLowerCase()},
        updated_at      = NOW()
      WHERE email = ${email}
      RETURNING *
    `

    if (!updated) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({ success: true, message: "Profile completed successfully", data: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
