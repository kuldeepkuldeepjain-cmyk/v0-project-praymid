import { query, execute } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

const SPIN_COST = 5

// Must exactly match SPIN_SEGMENTS in page.tsx (index = wheel position)
// Index 0: $10, 1: BETTER LUCK, 2: $4, 3: $1, 4: $50(never), 5: $5, 6: TRY AGAIN, 7: $2, 8: $100(never), 9: $3
const SPIN_PRIZES = [
  { label: "$10",         amount: 10, segmentIndex: 0,  probability: 0.03 },
  { label: "BETTER LUCK", amount: 0,  segmentIndex: 1,  probability: 0.20 },
  { label: "$4",          amount: 4,  segmentIndex: 2,  probability: 0.12 },
  { label: "$1",          amount: 1,  segmentIndex: 3,  probability: 0.25 },
  { label: "$5",          amount: 5,  segmentIndex: 5,  probability: 0.15 },
  { label: "TRY AGAIN",   amount: 0,  segmentIndex: 6,  probability: 0.10 },
  { label: "$2",          amount: 2,  segmentIndex: 7,  probability: 0.12 },
  { label: "$3",          amount: 3,  segmentIndex: 9,  probability: 0.03 },
  // Indexes 4 ($50) and 8 ($100) are never selected — probability 0
]

function selectPrize() {
  const random = Math.random()
  let cumulative = 0
  for (const prize of SPIN_PRIZES) {
    cumulative += prize.probability
    if (random <= cumulative) return prize
  }
  // Fallback to BETTER LUCK
  return SPIN_PRIZES[1]
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const rows = await query("SELECT * FROM participants WHERE email = $1", [email.toLowerCase().trim()])
    if (!rows || rows.length === 0) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const participant = rows[0]
    const currentBalance = parseFloat(participant.account_balance) || 0

    if (currentBalance < SPIN_COST) {
      return NextResponse.json({ error: `Insufficient balance. You need $${SPIN_COST} to spin.` }, { status: 400 })
    }

    // Deduct spin cost
    const balanceAfterDeduct = parseFloat((currentBalance - SPIN_COST).toFixed(2))
    await execute("UPDATE participants SET account_balance = $1 WHERE email = $2", [balanceAfterDeduct, email.toLowerCase().trim()])
    await execute(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_cost',$2,'Spin Wheel Entry Fee',$3,$4)",
      [email.toLowerCase().trim(), SPIN_COST, currentBalance, balanceAfterDeduct]
    )

    // Select prize
    const prize = selectPrize()
    let finalBalance = balanceAfterDeduct

    if (prize.amount > 0) {
      finalBalance = parseFloat((balanceAfterDeduct + prize.amount).toFixed(2))
      await execute("UPDATE participants SET account_balance = $1 WHERE email = $2", [finalBalance, email.toLowerCase().trim()])
      await execute(
        "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_win',$2,$3,$4,$5)",
        [email.toLowerCase().trim(), prize.amount, `Spin Wheel Win: ${prize.label}`, balanceAfterDeduct, finalBalance]
      )
    }

    return NextResponse.json({
      success: true,
      prize: { label: prize.label, amount: prize.amount, segmentIndex: prize.segmentIndex },
      balanceBefore: currentBalance,
      balanceAfter: finalBalance,
    })
  } catch (error) {
    console.error("[v0] Spin API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const rows = await query(
      "SELECT participant_email, amount, description, created_at FROM transactions WHERE type = 'spin_win' AND amount > 0 ORDER BY created_at DESC LIMIT 5"
    )
    const maskedWinners = rows.map((w: any) => ({
      email: w.participant_email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "User",
      amount: w.amount,
      description: w.description,
      timestamp: w.created_at,
    }))
    return NextResponse.json({ winners: maskedWinners })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
