import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const vercelCronHeader = request.headers.get("x-vercel-cron")
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isValidCron = vercelCronHeader === "true" || authHeader === `Bearer ${cronSecret}`

    if (!isValidCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

    const unmatchedContributions = await sql`
      SELECT id, participant_email, amount, reviewed_at
      FROM payment_submissions
      WHERE status = 'approved'
        AND matched_payout_id IS NULL
        AND reviewed_at <= ${thirtyMinutesAgo.toISOString()}
      ORDER BY reviewed_at ASC
      LIMIT 50
    `

    if (!unmatchedContributions.length) {
      return NextResponse.json({ success: true, message: "No contributions to auto-match", matchedCount: 0, timestamp: now.toISOString() })
    }

    let matchedCount = 0
    const matchResults = []

    for (const contribution of unmatchedContributions) {
      try {
        const payouts = await sql`
          SELECT id, serial_number FROM payout_requests
          WHERE participant_email = ${contribution.participant_email}
            AND status = 'pending'
            AND matched_contribution_id IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        `

        if (!payouts.length) {
          matchResults.push({ contribution_id: contribution.id, status: "skipped", reason: "No pending payout found" })
          continue
        }

        const payout = payouts[0]

        await sql`UPDATE payment_submissions SET matched_payout_id = ${payout.id}, matched_at = NOW() WHERE id = ${contribution.id}`
        await sql`UPDATE payout_requests SET matched_contribution_id = ${contribution.id}, matched_at = NOW(), status = 'in_process' WHERE id = ${payout.id}`

        await sql`
          INSERT INTO notifications (user_email, type, title, message, read_status)
          VALUES (${contribution.participant_email}, 'success', 'Payout Matched',
            ${'Your contribution was auto-matched with payout request #' + payout.serial_number + '. Processing in progress.'}, false)
        `.catch(() => {})

        await sql`
          INSERT INTO activity_logs (actor_email, action, details, target_type)
          VALUES ('system', 'auto_match_payout_contribution',
            ${'Auto-matched contribution ' + contribution.id + ' with payout #' + payout.serial_number + ' for ' + contribution.participant_email},
            'payment_submission')
        `.catch(() => {})

        matchedCount++
        matchResults.push({ contribution_id: contribution.id, payout_id: payout.id, payout_serial: payout.serial_number, status: "success" })
      } catch (itemError) {
        matchResults.push({ contribution_id: contribution.id, status: "error", error: itemError instanceof Error ? itemError.message : "Unknown" })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-matched ${matchedCount} contributions with payouts`,
      matchedCount,
      totalProcessed: unmatchedContributions.length,
      results: matchResults,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error", timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }
}
