import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { payoutId, status, transactionHash, adminNotes, redirectToEmail, redirectToSerial } = await request.json()

    if (!payoutId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const [payout] = await sql`SELECT * FROM payout_requests WHERE id = ${payoutId} LIMIT 1`
    if (!payout) return NextResponse.json({ success: false, error: "Payout request not found" }, { status: 404 })

    // Build update
    await sql`
      UPDATE payout_requests SET
        status = ${status},
        admin_notes = ${adminNotes || payout.admin_notes},
        processed_at = CASE WHEN ${status} != 'pending' AND processed_at IS NULL THEN NOW() ELSE processed_at END,
        transaction_hash = COALESCE(${transactionHash || null}, transaction_hash),
        redirect_to_email = CASE WHEN ${status} = 'redirected' THEN ${redirectToEmail || null} ELSE redirect_to_email END,
        redirect_to_serial = CASE WHEN ${status} = 'redirected' THEN ${redirectToSerial || null} ELSE redirect_to_serial END
      WHERE id = ${payoutId}
    `

    if (status === "completed") {
      const [participant] = await sql`SELECT total_received, account_balance FROM participants WHERE email = ${payout.participant_email} LIMIT 1`
      if (participant) {
        const newTotalReceived = Number(participant.total_received || 0) + Number(payout.amount)
        await sql`UPDATE participants SET total_received = ${newTotalReceived} WHERE email = ${payout.participant_email}`
        await sql`
          INSERT INTO transactions (participant_email, type, amount, description, reference_id)
          VALUES (${payout.participant_email}, 'payout_completed', ${payout.amount},
            ${'Payout completed - $' + payout.amount + ' sent to ' + payout.wallet_address}, ${String(payoutId)})
        `
        await sql`
          INSERT INTO activity_logs (actor_email, action, target_type, details)
          VALUES ('admin', 'payout_completed', 'payout',
            ${'Completed payout of $' + payout.amount + ' to ' + payout.participant_email + (transactionHash ? ' - TX: ' + transactionHash : '')})
        `
      }
    }

    if (status === "rejected") {
      const [participant] = await sql`SELECT account_balance FROM participants WHERE email = ${payout.participant_email} LIMIT 1`
      if (participant) {
        const refunded = Number(participant.account_balance || 0) + Number(payout.amount)
        await sql`UPDATE participants SET account_balance = ${refunded} WHERE email = ${payout.participant_email}`
        await sql`
          INSERT INTO transactions (participant_email, type, amount, description, reference_id)
          VALUES (${payout.participant_email}, 'payout_rejected', ${payout.amount},
            ${'Payout rejected and refunded - $' + payout.amount + (adminNotes ? ' - ' + adminNotes : '')}, ${String(payoutId)})
        `
        await sql`
          INSERT INTO activity_logs (actor_email, action, target_type, details)
          VALUES ('admin', 'payout_rejected', 'payout',
            ${'Rejected payout from ' + payout.participant_email + ' - $' + payout.amount + (adminNotes ? ' - ' + adminNotes : '')})
        `
      }
    }

    return NextResponse.json({ success: true, message: `Payout status updated to ${status}` })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
