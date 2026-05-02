import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    const expired = await sql`
      SELECT id, email, activation_deadline FROM participants
      WHERE activation_fee_paid = false
        AND (account_frozen IS NULL OR account_frozen = false)
        AND activation_deadline IS NOT NULL
        AND activation_deadline < NOW()
    `
    if (expired.length === 0) {
      return NextResponse.json({ success: true, message: "No expired accounts found", blockedCount: 0 })
    }
    const ids = expired.map((p: any) => p.id)
    await sql`UPDATE participants SET account_frozen = true, status = 'blocked', updated_at = NOW() WHERE id = ANY(${ids}::uuid[])`
    for (const p of expired) {
      await sql`
        INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details)
        VALUES ('account_blocked', ${p.id}, ${p.email}, 'participant', ${'Account blocked: missed activation deadline ' + p.activation_deadline})
      `
    }
    return NextResponse.json({
      success: true,
      message: `Blocked ${expired.length} expired accounts`,
      blockedCount: expired.length,
      blockedEmails: expired.map((p: any) => p.email),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to check expired accounts" }, { status: 500 })
  }
}
