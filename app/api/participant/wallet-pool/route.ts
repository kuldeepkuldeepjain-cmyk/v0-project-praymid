import { NextRequest, NextResponse } from "next/server"
import { query as dbQuery, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  // Admin database view calls this without auth — check if it's an admin request
  const { searchParams } = new URL(request.url)
  const adminMode = searchParams.get("admin") === "1"

  if (!adminMode) {
    const auth = await requireParticipantSession(request)
    if (!auth.ok) return auth.response
  }

  try {
    if (adminMode) {
      // Return all wallet pool entries for the admin database view
      const rows = await dbQuery("SELECT id, wallet_address, network, status, assigned_to FROM wallet_pool ORDER BY created_at DESC")
      return NextResponse.json({ walletPool: rows })
    }

    const wallets = await dbQuery(
      "SELECT id, wallet_address, network FROM wallet_pool WHERE status = 'active' AND assigned_to IS NULL ORDER BY created_at ASC LIMIT 10"
    )
    if (wallets.length === 0) {
      return NextResponse.json({ address: null, message: "No available wallets in pool" })
    }
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)] as any
    return NextResponse.json({ id: randomWallet.id, address: randomWallet.wallet_address, network: randomWallet.network, walletPool: wallets })
  } catch (error) {
    console.error("[v0] Error fetching wallet from pool:", error)
    return NextResponse.json({ error: "Failed to get wallet address" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress, network, assignedTo, email } = await request.json()
    const addr = walletAddress || assignedTo
    if (!addr) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    const existing = await dbQuery("SELECT id FROM wallet_pool WHERE wallet_address = $1", [addr])

    if (existing.length > 0) {
      await execute(
        "UPDATE wallet_pool SET status = $1, assigned_to = $2 WHERE id = $3",
        [email || assignedTo ? "assigned" : "active", email || assignedTo || null, (existing[0] as any).id]
      )
    } else {
      await execute(
        "INSERT INTO wallet_pool (wallet_address, network, status, assigned_to) VALUES ($1, $2, $3, $4)",
        [addr, network || "BEP20", email || assignedTo ? "assigned" : "active", email || assignedTo || null]
      )
    }

    return NextResponse.json({ success: true, message: "Wallet pool updated successfully" })
  } catch (error) {
    console.error("[v0] Error managing wallet pool:", error)
    return NextResponse.json({ error: "Failed to manage wallet pool" }, { status: 500 })
  }
}
