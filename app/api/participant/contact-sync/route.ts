import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId, contacts } = await request.json()

    if (!userId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const validContacts = contacts.filter((c: any) => c.name?.trim() && c.phone?.trim())

    if (validContacts.length === 0) {
      return NextResponse.json({ success: false, error: "No valid contacts provided" }, { status: 400 })
    }

    // Get participant email
    const rows = await query(
      `SELECT id, email, account_balance FROM participants WHERE id = $1 LIMIT 1`,
      [userId]
    )
    const participant = rows?.[0]

    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    // Insert contacts (ignore duplicates)
    for (const c of validContacts) {
      try {
        await execute(
          `INSERT INTO user_contacts (user_id, contact_name, contact_phone)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [userId, c.name.trim(), c.phone.trim()]
        )
      } catch {}
    }

    // Add $5 bonus and update sync status
    const newBalance = Number(participant.account_balance || 0) + 5
    await execute(
      `UPDATE participants
       SET account_balance = $1, contact_sync_completed = true, contact_sync_bonus_claimed = true
       WHERE id = $2`,
      [newBalance, userId]
    )

    // Log transaction
    try {
      await execute(
        `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
         VALUES ($1, 'contact_sync_bonus', 5, $2, $3, $4)`,
        [participant.email, `$5 bonus for syncing ${validContacts.length} contacts`, Number(participant.account_balance || 0), newBalance]
      )
    } catch {}

    return NextResponse.json({ success: true, bonusAmount: 5, newBalance })
  } catch (error) {
    console.error("[v0] Contact sync error:", error)
    return NextResponse.json({ success: false, error: "Failed to sync contacts" }, { status: 500 })
  }
}
