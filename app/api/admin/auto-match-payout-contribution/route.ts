import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const vercelCronHeader = request.headers.get("x-vercel-cron")
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isValidCron = vercelCronHeader === "true" || authHeader === `Bearer ${cronSecret}`
    if (!isValidCron) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const db = getServiceClient()
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

    const contribRes = await db.query(
      `SELECT id,participant_email,amount,reviewed_at FROM payment_submissions WHERE status='approved' AND matched_payout_id IS NULL AND reviewed_at<=$1 ORDER BY reviewed_at ASC LIMIT 50`,
      [thirtyMinutesAgo.toISOString()]
    )
    const unmatchedContributions = contribRes.rows

    if (!unmatchedContributions.length) {
      return NextResponse.json({ success: true, message: "No contributions to auto-match", matchedCount: 0 })
    }

    let matchedCount = 0
    const matchResults: any[] = []

    for (const contribution of unmatchedContributions) {
      try {
        const payoutRes = await db.query(
          `SELECT id,serial_number FROM payout_requests WHERE participant_email=$1 AND status='pending' AND matched_contribution_id IS NULL ORDER BY created_at ASC LIMIT 1`,
          [contribution.participant_email]
        )
        if (!payoutRes.rows.length) {
          matchResults.push({ contribution_id: contribution.id, status: "skipped", reason: "No pending payout found" })
          continue
        }
        const payout = payoutRes.rows[0]

        await db.query(`UPDATE payment_submissions SET matched_payout_id=$1, matched_at=$2 WHERE id=$3`, [payout.id, now.toISOString(), contribution.id])
        await db.query(`UPDATE payout_requests SET matched_contribution_id=$1, matched_at=$2, status='in_process' WHERE id=$3`, [contribution.id, now.toISOString(), payout.id])

        await db.query(
          `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'success','Payout Matched',$2,false)`,
          [contribution.participant_email, `Your contribution has been matched with payout request #${payout.serial_number}. Processing in progress.`]
        ).catch(() => {})

        await db.query(
          `INSERT INTO activity_logs(actor_email,action,details,target_type) VALUES('system','auto_match_payout_contribution',$1,'payment_submission')`,
          [`Auto-matched contribution ${contribution.id} with payout #${payout.serial_number} for ${contribution.participant_email}`]
        ).catch(() => {})

        matchedCount++
        matchResults.push({ contribution_id: contribution.id, payout_id: payout.id, payout_serial: payout.serial_number, status: "success" })
      } catch (itemError) {
        matchResults.push({ contribution_id: contribution.id, status: "error", error: itemError instanceof Error ? itemError.message : "Unknown error" })
      }
    }

    return NextResponse.json({ success: true, message: `Auto-matched ${matchedCount} contributions`, matchedCount, totalProcessed: unmatchedContributions.length, results: matchResults, timestamp: now.toISOString() })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
