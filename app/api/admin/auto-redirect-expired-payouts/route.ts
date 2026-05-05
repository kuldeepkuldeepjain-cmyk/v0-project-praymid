import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const PAYOUT_TIMEOUT_HOURS = 24

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getServiceClient()
    const cutoffTime = new Date(Date.now() - PAYOUT_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString()

    const expiredRes = await db.query(
      `SELECT * FROM payout_requests WHERE status='pending' AND created_at<$1 ORDER BY created_at ASC LIMIT 50`,
      [cutoffTime]
    )
    const expiredPayouts = expiredRes.rows

    if (!expiredPayouts.length) {
      return NextResponse.json({ success: true, message: "No expired payouts to redirect", redirectedCount: 0 })
    }

    let redirectedCount = 0
    const redirectResults: any[] = []

    for (const payout of expiredPayouts) {
      try {
        const nextRes = await db.query(
          `SELECT id,email,username,full_name,account_balance FROM participants WHERE email!=$1 ORDER BY created_at DESC LIMIT 5`,
          [payout.participant_email]
        )
        if (!nextRes.rows.length) continue
        const nextParticipant = nextRes.rows[0]
        const newBalance = Number(nextParticipant.account_balance) + Number(payout.amount)

        await db.query(`UPDATE participants SET account_balance=$1 WHERE id=$2`, [newBalance, nextParticipant.id])
        await db.query(
          `INSERT INTO transactions(participant_email,participant_id,type,amount,balance_before,balance_after,description) VALUES($1,$2,'payout_redirect',$3,$4,$5,$6)`,
          [nextParticipant.email, nextParticipant.id, payout.amount, nextParticipant.account_balance, newBalance, `Auto-redirected payout from expired request #${payout.id}`]
        )
        await db.query(
          `UPDATE payout_requests SET status='redirected', admin_notes=$1, processed_at=NOW() WHERE id=$2`,
          [`Auto-redirected after ${PAYOUT_TIMEOUT_HOURS}h. Original: ${payout.participant_email}`, payout.id]
        )
        await db.query(
          `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'payout_received','Payout Redirected To Your Account',$2,false)`,
          [nextParticipant.email, `You received a redirected payout of $${payout.amount}. New balance: $${newBalance.toFixed(2)}.`]
        )
        await db.query(
          `INSERT INTO activity_logs(actor_email,action,target_type,details) VALUES('system_auto_redirect','payout_auto_redirected','payout',$1)`,
          [`Auto-redirected payout $${payout.amount} from ${payout.participant_email} to ${nextParticipant.email}`]
        )

        redirectResults.push({ payoutId: payout.id, originalRecipient: payout.participant_email, newRecipient: nextParticipant.email, amount: payout.amount, status: "success" })
        redirectedCount++
      } catch (error) {
        redirectResults.push({ payoutId: payout.id, status: "failed", error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    return NextResponse.json({ success: true, message: `Auto-redirect completed. ${redirectedCount} payouts redirected.`, redirectedCount, results: redirectResults })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
