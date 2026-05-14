import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const PAYOUT_TIMEOUT_HOURS = 24

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const cutoffTime = new Date(Date.now() - PAYOUT_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString()

    const expiredRes = await db.query(
      `SELECT * FROM payout_requests WHERE status='pending' AND created_at<$1 ORDER BY created_at ASC LIMIT 50`,
      [cutoffTime]
    )
    const expiredPayouts = expiredRes.rows

    if (!expiredPayouts.length) {
      return NextResponse.json({ success: true, message: "No expired payouts found", expiredCount: 0, redirectedCount: 0 })
    }

    // Mark expired payouts as expired instead of redirecting to other participants
    for (const payout of expiredPayouts) {
      try {
        await db.query(
          `UPDATE payout_requests SET status='expired', admin_notes=$1, processed_at=NOW() WHERE id=$2`,
          [`Payout request expired after ${PAYOUT_TIMEOUT_HOURS}h without completion`, payout.id]
        )
        await db.query(
          `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'payout_expired','Payout Request Expired',$2,false)`,
          [payout.participant_email, `Your payout request of $${payout.amount} has expired. Please submit a new request if needed.`]
        )
        await db.query(
          `INSERT INTO activity_logs(actor_email,action,target_type,details) VALUES('system_auto','payout_expired','payout',$1)`,
          [`Payout request expired for ${payout.participant_email}`]
        )
      } catch (error) {
        console.error(`Failed to mark payout ${payout.id} as expired:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Auto-cleanup completed. ${expiredPayouts.length} expired payouts marked as expired.`, 
      expiredCount: expiredPayouts.length,
      redirectedCount: 0 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
