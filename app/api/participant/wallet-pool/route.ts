import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const wallets = await sql`
      SELECT * FROM wallet_pool
      WHERE status = 'active' AND assigned_to IS NULL
      ORDER BY created_at ASC
      LIMIT 10
    `

    if (!wallets.length) {
      return NextResponse.json({ address: null, message: "No available wallets in pool" })
    }

    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)]
    return NextResponse.json({ id: randomWallet.id, address: randomWallet.wallet_address, network: randomWallet.network })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress, network, assignedTo } = await request.json()

    if (!walletAddress) return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })

    const [existing] = await sql`SELECT id FROM wallet_pool WHERE wallet_address=${walletAddress}`

    if (existing) {
      await sql`
        UPDATE wallet_pool SET
          status      = ${assignedTo ? "assigned" : "active"},
          assigned_to = ${assignedTo || null}
        WHERE id = ${existing.id}
      `
    } else {
      await sql`
        INSERT INTO wallet_pool (wallet_address, network, status, assigned_to)
        VALUES (${walletAddress}, ${network || "BEP20"}, ${assignedTo ? "assigned" : "active"}, ${assignedTo || null})
      `
    }

    return NextResponse.json({ success: true, message: existing ? "Wallet updated" : "Wallet added to pool" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
