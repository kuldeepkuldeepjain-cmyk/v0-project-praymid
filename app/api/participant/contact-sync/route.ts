import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

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
    const rows = await sql`SELECT id, email, account_balance FROM participants WHERE id = ${userId} LIMIT 1`
    const participant = rows[0]

    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    // Insert contacts (ignore duplicates)
    for (const c of validContacts) {
      await sql`
        INSERT INTO user_contacts (user_id, contact_name, contact_phone)
        VALUES (${userId}, ${c.name.trim()}, ${c.phone.trim()})
        ON CONFLICT DO NOTHING
      `.catch(() => {}) // ignore individual errors
    }

    // Add $5 bonus and update sync status
    const newBalance = Number(participant.account_balance || 0) + 5
    await sql`
      UPDATE participants
      SET
        account_balance = ${newBalance},
        contact_sync_completed = true,
        contact_sync_bonus_claimed = true
      WHERE id = ${userId}
    `

    // Log transaction
    await sql`
      INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
      VALUES (${participant.email}, 'contact_sync_bonus', 5, ${`$5 bonus for syncing ${validContacts.length} contacts`}, ${Number(participant.account_balance || 0)}, ${newBalance})
    `.catch(() => {})

    return NextResponse.json({ success: true, bonusAmount: 5, newBalance })
  } catch (error) {
    console.error("[v0] Contact sync error:", error)
    return NextResponse.json({ success: false, error: "Failed to sync contacts" }, { status: 500 })
  }
}
