import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

async function runAutomatch() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const eligible = await sql`
    SELECT id, participant_email, amount FROM payment_submissions
    WHERE status = 'approved' AND matched_payout_id IS NULL AND created_at <= ${thirtyMinutesAgo}
    ORDER BY created_at ASC LIMIT 50
  `
  let matched = 0
  const details: any[] = []
  for (const contrib of eligible) {
    const payouts = await sql`
      SELECT id, serial_number FROM payout_requests
      WHERE status = 'pending' AND matched_contribution_id IS NULL
      ORDER BY created_at ASC LIMIT 1
    `
    if (payouts.length === 0) break
    const payout = payouts[0]
    const now = new Date().toISOString()
    await sql`UPDATE payment_submissions SET matched_payout_id = ${payout.id}, matched_at = ${now}, status = 'in_process' WHERE id = ${contrib.id}`
    await sql`UPDATE payout_requests SET matched_contribution_id = ${contrib.id}, matched_at = ${now}, status = 'in_process' WHERE id = ${payout.id}`
    await sql`INSERT INTO notifications (user_email, type, title, message) VALUES (${contrib.participant_email}, 'success', 'Contribution Matched', ${`Your contribution has been matched with payout #${payout.serial_number}.`})`
    matched++
    details.push({ contributionId: contrib.id, payoutId: payout.id, serialNumber: payout.serial_number })
  }
  return { matched, failed: 0, details, note: matched === 0 ? "No eligible pairs found" : undefined }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const result = await runAutomatch()
    return NextResponse.json({
      success: true,
      matched: result.matched,
      failed: result.failed,
      details: result.details,
      message: result.matched > 0 ? `Matched ${result.matched} contribution(s)` : result.note || "No eligible pairs found",
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
