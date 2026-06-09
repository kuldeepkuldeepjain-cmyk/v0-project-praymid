import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { participantEmail, costToOpen, reward, currentBalance } = await request.json()

    if (!participantEmail || !costToOpen || reward === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate balance
    if (currentBalance < costToOpen) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Calculate new balance
    const newBalance = currentBalance - costToOpen + reward

    // Get participant ID for transaction
    const participantRows: any[] = await query(
      `SELECT id, account_balance FROM participants WHERE email = $1`,
      [participantEmail]
    )

    if (!participantRows || participantRows.length === 0) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    const participantId = participantRows[0].id
    const balanceBefore = parseFloat(participantRows[0].account_balance || 0)

    // Update participant balance
    await execute(
      `UPDATE participants SET account_balance = $1 WHERE id = $2`,
      [newBalance, participantId]
    )

    // Record transaction for cost
    await execute(
      `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        participantEmail,
        "mystery_box_cost",
        -costToOpen,
        `Mystery Box Cost`,
        balanceBefore,
        balanceBefore - costToOpen,
        "completed",
      ]
    )

    // Record transaction for reward
    await execute(
      `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        participantEmail,
        "mystery_box_reward",
        reward,
        `Mystery Box Reward - $${reward}`,
        balanceBefore - costToOpen,
        newBalance,
        "completed",
      ]
    )

    return NextResponse.json(
      {
        success: true,
        newBalance,
        reward,
        message: `Successfully opened mystery box. Won $${reward}!`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Mystery box error:", error)
    return NextResponse.json({ error: "Failed to process mystery box" }, { status: 500 })
  }
}
