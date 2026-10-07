import { execute, query, queryOne } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const pool = await query("SELECT id, wallet_address, assigned_to FROM wallet_pool")
    return NextResponse.json({ success: true, pool })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { email, wallet_address } = await req.json()
    if (typeof email !== "string" || !email.trim() || typeof wallet_address !== "string" || !wallet_address.trim()) {
      return NextResponse.json({ success: false, error: "Email and wallet address are required" }, { status: 400 })
    }
    const existing = await queryOne("SELECT id FROM wallet_pool WHERE assigned_to = $1 LIMIT 1", [email.trim()])
    if (existing) {
      await execute("UPDATE wallet_pool SET wallet_address = $1 WHERE assigned_to = $2", [wallet_address.trim(), email.trim()])
    } else {
      await execute(
        "INSERT INTO wallet_pool (wallet_address, network, status, assigned_to) VALUES ($1, 'BSC', 'assigned', $2)",
        [wallet_address.trim(), email.trim()]
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
