import { query, execute } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

// Actual prizes that can be won (50 and 100 are for display only, never won)
const SPIN_PRIZES = [
  { label: "$2", amount: 2, probability: 0.23 },
  { label: "$1", amount: 1, probability: 0.18 },
  { label: "$5", amount: 5, probability: 0.18 },
  { label: "Oops!", amount: 0, probability: 0.18 },
  { label: "$3", amount: 3, probability: 0.21 },
  { label: "$10", amount: 10, probability: 0.02 },
]

// Refer and Jackpot map to real prizes
const SPECIAL_PRIZES = [
  { label: "Refer a Friend", actualAmount: 10, probability: 0.05 },
]

const SPIN_COST = 5

function selectPrize() {
  const random = Math.random()
  let cumulative = 0
  
  // Check special prizes first
  for (const prize of SPECIAL_PRIZES) {
    cumulative += prize.probability
    if (random <= cumulative) return { label: prize.label, amount: prize.actualAmount }
  }
  
  // Then regular prizes
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

    const rows = await query("SELECT * FROM participants WHERE email = $1", [email])
    if (!rows || rows.length === 0) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    
    const participant = rows[0]
    if (participant.account_balance < SPIN_COST) {
      return NextResponse.json({ error: `Insufficient balance. You need $${SPIN_COST} to spin.` }, { status: 400 })
    }

    const newBalance = participant.account_balance - SPIN_COST
    await execute("UPDATE participants SET account_balance = $1 WHERE email = $2", [newBalance, email])
    await execute(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_cost',$2,'Spin Wheel Entry Fee',$3,$4)",
      [email, -SPIN_COST, participant.account_balance, newBalance]
    )

    const prize = selectPrize()
    let finalBalance = newBalance
    let wheelSegmentIndex = 0

    if (prize.amount > 0) {
      // WIN: Add prize to balance
      finalBalance = newBalance + prize.amount
      await execute("UPDATE participants SET account_balance = $1 WHERE email = $2", [finalBalance, email])
      await execute(
        "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_win',$2,$3,$4,$5)",
        [email, prize.amount, `Spin Wheel Prize: ${prize.label}`, newBalance, finalBalance]
      )
    } else {
      // LOSS: Record loss transaction (amount is 0, balance stays same after spin cost deduction)
      await execute(
        "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'spin_loss',$2,$3,$4,$5)",
        [email, 0, `Spin Wheel Loss: ${prize.label}`, newBalance, finalBalance]
      )
    }

    // Map prize to wheel segment index (order from page.tsx WHEEL_SEGMENTS)
    // This ensures 50 and 100 never appear to win
    const prizeToSegmentMap: Record<string, number> = {
      "$2": 0,
      "$1": 1,
      "$5": 2,
      "Oops!": 3,
      "$3": 4,
      "$10": 5,
      "Refer a Friend": 6,
      // Note: JACKPOT (50) is index 7 but will NEVER be selected
    }

    wheelSegmentIndex = prizeToSegmentMap[prize.label] ?? 0

    return NextResponse.json({
      success: true,
      prize: { label: prize.label, amount: prize.amount, segmentIndex: wheelSegmentIndex },
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
