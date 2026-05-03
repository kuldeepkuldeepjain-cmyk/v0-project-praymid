import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const PAYOUT_TIMEOUT_HOURS = 24

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const expiredPayouts = await sql`
      SELECT * FROM payout_requests
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '${PAYOUT_TIMEOUT_HOURS} hours'
      ORDER BY created_at ASC
      LIMIT 50
    `

    if (!expiredPayouts.length) {
      return NextResponse.json({ success: true, message: "No expired payouts to redirect", redirectedCount: 0 })
    }

    let redirectedCount = 0
    const redirectResults = []

    for (const payout of expiredPayouts) {
      try {
        const [nextParticipant] = await sql`
          SELECT id, email, username, full_name, account_balance
          FROM participants
          WHERE email != ${payout.participant_email}
          ORDER BY created_at DESC
          LIMIT 1
        `

        if (!nextParticipant) continue

        const newBalance = Number(nextParticipant.account_balance) + Number(payout.amount)

        await sql`UPDATE participants SET account_balance=${newBalance} WHERE id=${nextParticipant.id}`

        await sql`
          INSERT INTO transactions (participant_email, participant_id, type, amount, balance_before, balance_after, description, reference_id)
          VALUES (${nextParticipant.email}, ${nextParticipant.id}, 'payout_redirect', ${payout.amount},
            ${nextParticipant.account_balance}, ${newBalance},
            ${'Auto-redirected payout from expired request (original: ' + payout.participant_email + ')'},
            ${'AUTO_REDIRECT_' + payout.id})
        `

        await sql`
          UPDATE payout_requests SET
            status = 'redirected',
            redirect_to_email = ${nextParticipant.email},
            admin_notes = ${'Auto-redirected after ' + PAYOUT_TIMEOUT_HOURS + 'h inactivity. Original: ' + payout.participant_email},
            processed_at = NOW()
          WHERE id = ${payout.id}
        `

        await sql`
          INSERT INTO notifications (user_email, type, title, message)
          VALUES (${nextParticipant.email}, 'success', 'Payout Redirected to Your Account',
            ${'You have received a redirected payout of $' + payout.amount + '. Your new balance is $' + newBalance.toFixed(2) + '.'})
        `

        await sql`
          INSERT INTO activity_logs (actor_email, action, target_type, target_id, details)
          VALUES ('system_auto_redirect', 'payout_auto_redirected', 'payout', ${payout.id},
            ${'Redirected $' + payout.amount + ' from ' + payout.participant_email + ' to ' + nextParticipant.email + ' after ' + PAYOUT_TIMEOUT_HOURS + 'h timeout'})
        `

        redirectResults.push({ payoutId: payout.id, originalRecipient: payout.participant_email, newRecipient: nextParticipant.email, amount: payout.amount, status: "success" })
        redirectedCount++
      } catch (error: any) {
        redirectResults.push({ payoutId: payout.id, status: "failed", error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-redirect completed. ${redirectedCount} payouts redirected.`,
      redirectedCount,
      results: redirectResults,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
