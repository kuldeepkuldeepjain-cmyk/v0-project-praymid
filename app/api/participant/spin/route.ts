import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

// Weighted probability configuration
const SPIN_PRIZES = [
  { label: "$2", amount: 2, probability: 0.20 },        // 20%
  { label: "$1", amount: 1, probability: 0.10 },        // 10%
  { label: "$5", amount: 5, probability: 0.15 },        // 15%
  { label: "Oops!", amount: 0, probability: 0.10 },     // 10%
  { label: "$3", amount: 3, probability: 0.25 },        // 25%
  { label: "$10", amount: 10, probability: 0.05 },      // 5%
  { label: "Refer a Friend", amount: 10, probability: 0.10 }, // 10%
  { label: "JACKPOT", amount: 50, probability: 0.05 },  // 5%
]

const SPIN_COST = 5

function selectPrize(): typeof SPIN_PRIZES[0] {
  const random = Math.random()
  let cumulative = 0

  for (const prize of SPIN_PRIZES) {
    cumulative += prize.probability
    if (random <= cumulative) {
      return prize
    }
  }

  // Fallback to first prize (should never reach here)
  return SPIN_PRIZES[0]
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Get participant data
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("email", email)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    // 2. Check wallet balance
    if (participant.account_balance < SPIN_COST) {
      return NextResponse.json(
        { error: `Insufficient balance. You need $${SPIN_COST} to spin.` },
        { status: 400 }
      )
    }

    // 3. Deduct spin cost
    const newBalance = participant.account_balance - SPIN_COST
    const { error: deductError } = await supabase
      .from("participants")
      .update({ account_balance: newBalance })
      .eq("email", email)

    if (deductError) {
      console.error("[v0] Error deducting spin cost:", deductError)
      return NextResponse.json({ error: "Failed to process spin" }, { status: 500 })
    }

    // 4. Record the deduction transaction
    await supabase.from("transactions").insert({
      participant_email: email,
      type: "spin_cost",
      amount: -SPIN_COST,
      description: "Spin Wheel Entry Fee",
      balance_before: participant.account_balance,
      balance_after: newBalance,
    })

    // 5. Select prize based on weighted probability
    const prize = selectPrize()

    // 6. Credit the prize amount
    let finalBalance = newBalance
    if (prize.amount > 0) {
      finalBalance = newBalance + prize.amount
      const { error: creditError } = await supabase
        .from("participants")
        .update({ account_balance: finalBalance })
        .eq("email", email)

      if (creditError) {
        console.error("[v0] Error crediting prize:", creditError)
        return NextResponse.json({ error: "Failed to credit prize" }, { status: 500 })
      }

      // Record the win transaction
      await supabase.from("transactions").insert({
        participant_email: email,
        type: "spin_win",
        amount: prize.amount,
        description: `Spin Wheel Prize: ${prize.label}`,
        balance_before: newBalance,
        balance_after: finalBalance,
      })
    }

    // 7. Calculate segment index for the frontend (0-7)
    const segmentIndex = SPIN_PRIZES.findIndex(p => p.label === prize.label)

    return NextResponse.json({
      success: true,
      prize: {
        label: prize.label,
        amount: prize.amount,
        segmentIndex,
      },
      balanceBefore: participant.account_balance,
      balanceAfter: finalBalance,
    })
  } catch (error) {
    console.error("[v0] Spin API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get last 5 winners
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: winners, error } = await supabase
      .from("transactions")
      .select("participant_email, amount, description, created_at")
      .eq("type", "spin_win")
      .gt("amount", 0)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("[v0] Error fetching winners:", error)
      return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 })
    }

    // Mask email addresses for privacy
    const maskedWinners = (winners || []).map(w => ({
      email: w.participant_email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "User",
      amount: w.amount,
      description: w.description,
      timestamp: w.created_at,
    }))

    return NextResponse.json({ winners: maskedWinners })
  } catch (error) {
    console.error("[v0] Winners API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
