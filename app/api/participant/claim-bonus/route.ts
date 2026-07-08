import { NextResponse } from "next/server"
import { query } from "@/lib/db"

/**
 * POST /api/participant/claim-bonus
 * 
 * Claim the $50 welcome bonus when participant makes their first contribution
 * 
 * Requirements:
 * - Participant must have unclaimed_bonus > 0
 * - Participant must NOT have already claimed the bonus
 * - Participant should have made a payment submission/contribution
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      )
    }

    const emailKey = email.toLowerCase().trim()

    // Get participant with unclaimed bonus
    const participants = await query<Record<string, any>>(
      `SELECT id, email, account_balance, unclaimed_bonus, bonus_claimed, bonus_claimed_at
       FROM participants
       WHERE email = $1 AND unclaimed_bonus > 0 AND bonus_claimed = false
       LIMIT 1`,
      [emailKey]
    )

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { success: false, message: "No unclaimed bonus available for this account or bonus already claimed" },
        { status: 400 }
      )
    }

    const participant = participants[0]
    const bonusAmount = participant.unclaimed_bonus
    const newBalance = parseFloat(participant.account_balance) + bonusAmount

    // Claim the bonus: add to account_balance and mark as claimed
    const updated = await query<Record<string, any>>(
      `UPDATE participants
       SET account_balance = $1,
           bonus_claimed = true,
           bonus_claimed_at = NOW(),
           unclaimed_bonus = 0,
           updated_at = NOW()
       WHERE id = $2 AND bonus_claimed = false
       RETURNING id, email, account_balance, unclaimed_bonus, bonus_claimed, bonus_claimed_at`,
      [newBalance, participant.id]
    )

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { success: false, message: "Failed to claim bonus. It may have already been claimed." },
        { status: 400 }
      )
    }

    const updatedParticipant = updated[0]

    // Log the transaction
    try {
      await query(
        `INSERT INTO transactions
         (participant_id, participant_email, type, amount, description, status, balance_before, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          participant.id,
          emailKey,
          "bonus_claim",
          bonusAmount,
          "Welcome bonus claimed upon first contribution",
          "completed",
          participant.account_balance,
          newBalance
        ]
      )
    } catch (e) {
      console.log("[v0] Failed to log bonus claim transaction:", e)
    }

    console.log(`[v0] Bonus claimed successfully for ${emailKey}: +$${bonusAmount}`)

    return NextResponse.json({
      success: true,
      message: `Welcome bonus of $${bonusAmount} has been added to your account!`,
      bonus_claimed: true,
      bonus_amount: bonusAmount,
      new_balance: parseFloat(updatedParticipant.account_balance),
      claimed_at: updatedParticipant.bonus_claimed_at
    }, { status: 200 })

  } catch (error: any) {
    console.error("[v0] Claim bonus error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to claim bonus" },
      { status: 500 }
    )
  }
}
