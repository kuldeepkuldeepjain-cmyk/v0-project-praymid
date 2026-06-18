import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST() {
  try {
    const db = getPool()!
    const { rows: expiredParticipants } = await db.query(
      "SELECT * FROM participants WHERE is_active = false AND is_frozen = false AND activation_date < NOW()"
    )

    if (!expiredParticipants || expiredParticipants.length === 0) {
      return NextResponse.json({ success: true, message: "No expired accounts found", blockedCount: 0 })
    }

    const ids = expiredParticipants.map((p: any) => p.id)
    await db.query(
      `UPDATE participants SET is_frozen = true, status = 'blocked' WHERE id = ANY($1::uuid[])`, [ids]
    )

    for (const participant of expiredParticipants) {
      await db.query(
        "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ('account_blocked',$1,$2,'participant',$3)",
        [participant.id, participant.email, `Account automatically blocked: failed activation deadline.`]
      )
    }

    return NextResponse.json({
      success: true,
      message: `Blocked ${expiredParticipants.length} expired accounts`,
      blockedCount: expiredParticipants.length,
      blockedEmails: expiredParticipants.map((p: any) => p.email),
    })
  } catch (error) {
    console.error("[v0] Check expired error:", error)
    return NextResponse.json({ success: false, error: "Failed to check expired accounts" }, { status: 500 })
  }
}
