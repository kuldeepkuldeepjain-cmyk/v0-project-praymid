import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, userEmail, amount, transactionHash, screenshotBase64, note } = await request.json()

    if (!userId || !userEmail || !amount || !transactionHash) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 5) {
      return NextResponse.json({ success: false, message: "Invalid amount. Minimum is $5" }, { status: 400 })
    }

    const existingTx = await query(
      "SELECT id FROM topup_requests WHERE transaction_id = $1",
      [transactionHash]
    ) as any[]
    if (existingTx.length > 0) {
      return NextResponse.json({ success: false, message: "This transaction has already been submitted" }, { status: 400 })
    }

    const participants = await query(
      "SELECT id FROM participants WHERE email = $1 LIMIT 1",
      [userEmail]
    ) as any[]
    if (participants.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }
    const participant = participants[0]

    await execute(
      `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status)
       VALUES ($1, $2, $3, $4, 'crypto', 'pending')`,
      [participant.id, userEmail, parsedAmount, transactionHash]
    )

    // Log activity (best-effort — table may not exist)
    await execute(
      `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)`,
      [participant.id, userEmail, "topup_requested", "wallet", `Submitted $${parsedAmount} top-up (tx: ${transactionHash.slice(0, 12)}...)`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Top-up request submitted successfully" })
  } catch (error) {
    console.error("Top-up submit error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
