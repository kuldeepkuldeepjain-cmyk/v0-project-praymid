import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { DEFAULT_CHALLENGE_PLANS, getChallengePlan } from "@/lib/challenge-account"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const result = await db.query(
      "SELECT id, email, username, account_type, account_balance, challenge_plan_key, challenge_status, challenge_started_at, challenge_trading_days, challenge_last_trading_date FROM participants WHERE id = $1",
      [auth.participantId]
    )
    const participant = result.rows[0]
    if (!participant) return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })
    return NextResponse.json({ success: true, participant, plans: DEFAULT_CHALLENGE_PLANS })
  } catch (error) {
    console.error("[v0] Challenge GET error:", error)
    return NextResponse.json({ success: false, message: "Unable to load Challenge account" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { planKey, transactionHash, walletAddress } = await request.json()
    const plan = getChallengePlan(planKey)
    if (!plan || typeof transactionHash !== "string" || transactionHash.trim().length < 8 || typeof walletAddress !== "string" || walletAddress.trim().length < 8) {
      return NextResponse.json({ success: false, message: "Choose a valid plan and provide the payment transaction details." }, { status: 400 })
    }
    const db = getPool()!
    const participantResult = await db.query("SELECT id, email, challenge_status FROM participants WHERE id = $1 FOR UPDATE", [auth.participantId])
    const participant = participantResult.rows[0]
    if (!participant) return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })
    if (["active", "pending_payment"].includes(participant.challenge_status)) {
      return NextResponse.json({ success: false, message: "You already have a Challenge account request in progress." }, { status: 409 })
    }
    const duplicate = await db.query("SELECT id FROM topup_requests WHERE transaction_id = $1", [transactionHash.trim()])
    if (duplicate.rows.length) return NextResponse.json({ success: false, message: "This transaction has already been submitted." }, { status: 409 })
    await db.query(
      "INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status, admin_notes) VALUES ($1,$2,$3,$4,'crypto','pending',$5)",
      [participant.id, participant.email, plan.fee, transactionHash.trim(), `Challenge plan: ${plan.key}; wallet: ${walletAddress.trim()}`]
    )
    await db.query("UPDATE participants SET challenge_plan_key = $1, challenge_status = 'pending_payment', updated_at = NOW() WHERE id = $2", [plan.key, participant.id])
    return NextResponse.json({ success: true, message: "Challenge payment submitted for review." })
  } catch (error) {
    console.error("[v0] Challenge POST error:", error)
    return NextResponse.json({ success: false, message: "Unable to submit Challenge payment" }, { status: 500 })
  }
}
