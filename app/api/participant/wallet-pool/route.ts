import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const result = await db.query(
      "SELECT id, wallet_address, network FROM wallet_pool WHERE status = 'active' AND assigned_to IS NULL ORDER BY created_at ASC LIMIT 10"
    )
    const wallets = result.rows
    if (wallets.length === 0) {
      return NextResponse.json({ address: null, message: "No available wallets in pool" })
    }
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)]
    return NextResponse.json({ id: randomWallet.id, address: randomWallet.wallet_address, network: randomWallet.network })
  } catch (error) {
    console.error("[v0] Error fetching wallet from pool:", error)
    return NextResponse.json({ error: "Failed to get wallet address" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress, network, assignedTo } = await request.json()
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    const db = getPool()!
    const existing = await db.query("SELECT id FROM wallet_pool WHERE wallet_address = $1", [walletAddress])

    if (existing.rows.length > 0) {
      await db.query(
        "UPDATE wallet_pool SET status = $1, assigned_to = $2 WHERE id = $3",
        [assignedTo ? "assigned" : "active", assignedTo || null, existing.rows[0].id]
      )
    } else {
      await db.query(
        "INSERT INTO wallet_pool (wallet_address, network, status, assigned_to) VALUES ($1, $2, $3, $4)",
        [walletAddress, network || "BEP20", assignedTo ? "assigned" : "active", assignedTo || null]
      )
    }

    return NextResponse.json({ success: true, message: "Wallet pool updated successfully" })
  } catch (error) {
    console.error("[v0] Error managing wallet pool:", error)
    return NextResponse.json({ error: "Failed to manage wallet pool" }, { status: 500 })
  }
}
