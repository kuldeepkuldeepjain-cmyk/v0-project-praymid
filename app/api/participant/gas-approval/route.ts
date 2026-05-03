import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { participantEmail, walletAddress, txHash, amount } = await request.json()
    if (!participantEmail || !walletAddress || !txHash || !amount) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const participant = await sql`SELECT id FROM participants WHERE email = ${participantEmail} LIMIT 1`
    await sql`
      INSERT INTO gas_approvals (participant_id, participant_email, wallet_address, transaction_hash, gas_fee, status)
      VALUES (${participant[0]?.id || null}, ${participantEmail}, ${walletAddress}, ${txHash}, ${amount}, 'pending_collection')
    `
    await sql`INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES (${participantEmail}, 'gas_approval', 'gas_approval', ${`Gas fee approved: $${amount} USDT - Tx: ${txHash.slice(0, 10)}...`})`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to record approval" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const approvals = await sql`SELECT * FROM gas_approvals ORDER BY created_at DESC`
    return NextResponse.json({ approvals })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 })
  }
}
