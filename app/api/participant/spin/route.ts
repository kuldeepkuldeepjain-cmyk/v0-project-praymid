import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
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
  let cumulative = 0
  const random = Math.random()
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

    const rows = await sql`SELECT id, account_balance FROM participants WHERE email = ${email} LIMIT 1`
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    if (Number(participant.account_balance) < SPIN_COST) return NextResponse.json({ error: `Insufficient balance. You need $${SPIN_COST} to spin.` }, { status: 400 })

    const balanceAfterCost = Number(participant.account_balance) - SPIN_COST
    await sql`UPDATE participants SET account_balance = ${balanceAfterCost}, updated_at = NOW() WHERE email = ${email}`
    await sql`INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after) VALUES (${participant.id}, ${email}, 'spin_cost', ${-SPIN_COST}, 'Spin Wheel Entry Fee', ${participant.account_balance}, ${balanceAfterCost})`

    const prize = selectPrize()
    let finalBalance = balanceAfterCost
    if (prize.amount > 0) {
      finalBalance = balanceAfterCost + prize.amount
      await sql`UPDATE participants SET account_balance = ${finalBalance}, updated_at = NOW() WHERE email = ${email}`
      await sql`INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after) VALUES (${participant.id}, ${email}, 'spin_win', ${prize.amount}, ${`Spin Wheel Prize: ${prize.label}`}, ${balanceAfterCost}, ${finalBalance})`
    }

    const segmentIndex = SPIN_PRIZES.findIndex(p => p.label === prize.label)
    return NextResponse.json({ success: true, prize: { label: prize.label, amount: prize.amount, segmentIndex }, balanceBefore: participant.account_balance, balanceAfter: finalBalance })
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const winners = await sql`
      SELECT participant_email, amount, description, created_at FROM transactions
      WHERE type = 'spin_win' AND amount > 0
      ORDER BY created_at DESC LIMIT 5
    `
    const maskedWinners = winners.map((w: any) => ({
      email: w.participant_email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "User",
      amount: w.amount,
      description: w.description,
      timestamp: w.created_at,
    }))
    return NextResponse.json({ winners: maskedWinners })
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
