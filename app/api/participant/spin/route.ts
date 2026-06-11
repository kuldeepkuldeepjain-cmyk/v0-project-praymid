import { query, execute } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// 8 segments — indexes must match WHEEL_SEGMENTS order in page.tsx
// Order: 3.0x, 5.0x, 0.5x, 4.0x, 1.5x, 2.0x, 10.0x, 2.5x
const SPIN_SEGMENTS = [
  { label: "3.0x",  multiplier: 3.0,  segmentIndex: 0, probability: 0.15 },
  { label: "5.0x",  multiplier: 5.0,  segmentIndex: 1, probability: 0.07 },
  { label: "0.5x",  multiplier: 0.5,  segmentIndex: 2, probability: 0.20 },
  { label: "4.0x",  multiplier: 4.0,  segmentIndex: 3, probability: 0.12 },
  { label: "1.5x",  multiplier: 1.5,  segmentIndex: 4, probability: 0.18 },
  { label: "2.0x",  multiplier: 2.0,  segmentIndex: 5, probability: 0.15 },
  { label: "10.0x", multiplier: 10.0, segmentIndex: 6, probability: 0.03 },
  { label: "2.5x",  multiplier: 2.5,  segmentIndex: 7, probability: 0.10 },
]
// probabilities sum = 1.00

function selectSegment() {
  const r = Math.random()
  let cumulative = 0
  for (const seg of SPIN_SEGMENTS) {
    cumulative += seg.probability
    if (r <= cumulative) return seg
  }
  return SPIN_SEGMENTS[4] // fallback: 1.5x
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, spinAmount } = body

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const amount = parseFloat(spinAmount) || 0
    if (amount <= 0) return NextResponse.json({ error: "Invalid spin amount" }, { status: 400 })

    // Fetch participant
    const rows = await query(
      "SELECT email, account_balance FROM participants WHERE email = $1",
      [email.toLowerCase().trim()]
    )
    if (!rows.length) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const participant = rows[0]
    const currentBalance = parseFloat(participant.account_balance) || 0

    if (currentBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${amount} USDT to spin.` },
        { status: 400 }
      )
    }

    // Deduct spin cost
    const balanceAfterDeduct = parseFloat((currentBalance - amount).toFixed(2))
    await execute(
      "UPDATE participants SET account_balance = $1 WHERE email = $2",
      [balanceAfterDeduct, email.toLowerCase().trim()]
    )
    await execute(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1, 'spin_cost', $2, $3, $4, $5)",
      [email.toLowerCase().trim(), amount, `Spin Wheel — bet ${amount} USDT`, currentBalance, balanceAfterDeduct]
    )

    // Pick winner segment
    const segment = selectSegment()
    const winAmount = parseFloat((amount * segment.multiplier).toFixed(2))
    const finalBalance = parseFloat((balanceAfterDeduct + winAmount).toFixed(2))

    // Credit winnings
    await execute(
      "UPDATE participants SET account_balance = $1 WHERE email = $2",
      [finalBalance, email.toLowerCase().trim()]
    )
    await execute(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1, 'spin_win', $2, $3, $4, $5)",
      [email.toLowerCase().trim(), winAmount, `Spin Wheel Win: ${segment.label} × ${amount} USDT`, balanceAfterDeduct, finalBalance]
    )

    return NextResponse.json({
      success: true,
      prize: {
        label: segment.label,
        multiplier: segment.multiplier,
        amount: winAmount,
        segmentIndex: segment.segmentIndex,
      },
      balanceBefore: currentBalance,
      balanceAfter: finalBalance,
    })
  } catch (error) {
    console.error("[spin] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const rows = await query(
      "SELECT participant_email, amount, description, created_at FROM transactions WHERE type = 'spin_win' ORDER BY created_at DESC LIMIT 8"
    )
    const winners = rows.map((w: any) => ({
      email: (w.participant_email as string).replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      amount: w.amount,
      description: w.description,
      timestamp: w.created_at,
    }))
    return NextResponse.json({ winners })
  } catch (error) {
    console.error("[spin] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
