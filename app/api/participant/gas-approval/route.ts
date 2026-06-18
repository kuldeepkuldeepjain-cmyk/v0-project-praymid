import { NextRequest, NextResponse } from "next/server"
import { addActivityLog } from "@/app/api/admin/activity/route"
import { requireParticipantSession } from "@/lib/auth-middleware"

type GasApproval = {
  id: string
  participantEmail: string
  walletAddress: string
  txHash: string
  amount: number
  approvedAt: string
  collected: boolean
  collectedAt?: string
}

const gasApprovals: GasApproval[] = []

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { participantEmail, walletAddress, txHash, amount } = body

    if (!participantEmail || !walletAddress || !txHash || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const approval: GasApproval = {
      id: `GA${Date.now()}`,
      participantEmail,
      walletAddress,
      txHash,
      amount,
      approvedAt: new Date().toISOString(),
      collected: false,
    }

    gasApprovals.push(approval)

    console.log("[v0] Gas approval recorded:", approval)

    addActivityLog({
      action: "gas_approval",
      actor_id: walletAddress,
      actor_email: participantEmail,
      target_id: approval.id,
      target_type: "gas_approval",
      details: `Gas fee approved: $${amount} USDT - Tx: ${txHash.slice(0, 10)}...`,
    })

    return NextResponse.json({ success: true, approval })
  } catch (error) {
    console.error("[v0] Gas approval error:", error)
    return NextResponse.json({ error: "Failed to record approval" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  return NextResponse.json({ approvals: gasApprovals })
}
