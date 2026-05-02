import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, approvalTxHash, walletAddress, collectorAddress, tokenAddress, network, timestamp } = await request.json()

    if (!userId || !amount || !approvalTxHash || !walletAddress) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 })
    }

    const [participant] = await sql`SELECT id, email FROM participants WHERE email=${userId}`
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    await sql`
      INSERT INTO gas_approvals (participant_id, participant_email, wallet_address, transaction_hash, gas_fee, network, status, created_at)
      VALUES (${participant.id}, ${participant.email}, ${walletAddress}, ${approvalTxHash}, ${parsedAmount},
        ${network || "BSC"}, 'pending_collection', ${timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()})
    `

    await sql`
      INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status)
      VALUES (${participant.id}, ${participant.email}, ${parsedAmount}, ${approvalTxHash}, 'crypto_approval', 'pending_collection')
    `

    return NextResponse.json({
      success: true,
      message: "Approval recorded. Admin will collect tokens shortly.",
      data: { approvalTxHash, amount: parsedAmount, status: "pending_collection", collectorAddress, tokenAddress },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
