import { getPool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

const SPIN_PRIZES = [
  { label: "$2", amount: 2, probability: 0.20 },
  { label: "$1", amount: 1, probability: 0.10 },
  { label: "$5", amount: 5, probability: 0.15 },
  { label: "Oops!", amount: 0, probability: 0.10 },
  { label: "$3", amount: 3, probability: 0.25 },
  { label: "$10", amount: 10, probability: 0.05 },
  { label: "Refer a Friend", amount: 10, probability: 0.10 },
  { label: "JACKPOT", amount: 50, probability: 0.05 },
]
const SPIN_COST = 5

function selectPrize() {
  const random = Math.random()
  let cumulative = 0
  for (const prize of SPIN_PRIZES) {
    cumulative += prize.probability
    if (random <= cumulative) return prize
  }
  return SPIN_PRIZES[0]
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const { rows } = await db.query("SELECT * FROM participants WHERE email = $1", [email])
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    if (participant.account_balance < SPIN_COST) {
      return NextResponse.json({ error: `Insufficient balance. You need $${SPIN_COST} to spin.` }, { status: 400 })
    }

    const newBalance = participant.account_balance - SPIN_COST
    await db.query("UPDATE participants SET account_balance = $1 WHERE email = $2", [newBalance, email])
    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_cost',$2,'Spin Wheel Entry Fee',$3,$4)",
      [email, -SPIN_COST, participant.account_balance, newBalance]
    )

    const prize = selectPrize()
    let finalBalance = newBalance

    if (prize.amount > 0) {
      finalBalance = newBalance + prize.amount
      await db.query("UPDATE participants SET account_balance = $1 WHERE email = $2", [finalBalance, email])
      await db.query(
        "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_win',$2,$3,$4,$5)",
        [email, prize.amount, `Spin Wheel Prize: ${prize.label}`, newBalance, finalBalance]
      )
    }

    const segmentIndex = SPIN_PRIZES.findIndex(p => p.label === prize.label)
    return NextResponse.json({
      success: true,
      prize: { label: prize.label, amount: prize.amount, segmentIndex },
      balanceBefore: participant.account_balance,
      balanceAfter: finalBalance,
    })
  } catch (error) {
    console.error("[v0] Spin API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getPool()!
    const { rows } = await db.query(
      "SELECT participant_email, amount, description, created_at FROM transactions WHERE type = 'spin_win' AND amount > 0 ORDER BY created_at DESC LIMIT 5"
    )
    const maskedWinners = rows.map((w: any) => ({
      email: w.participant_email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "User",
      amount: w.amount, description: w.description, timestamp: w.created_at,
    }))
    return NextResponse.json({ winners: maskedWinners })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
