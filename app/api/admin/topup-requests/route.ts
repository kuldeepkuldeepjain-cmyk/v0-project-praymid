import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { requestId, action, adminEmail, adminNotes, rejectionReason } = body

    if (!requestId || !action || !adminEmail) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
    }

    const [topup] = await sql`SELECT * FROM topup_requests WHERE id = ${requestId} LIMIT 1`
    if (!topup) return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 })
    if (topup.status !== "pending") {
      return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 })
    }

    if (action === "approve") {
      const [participant] = await sql`SELECT account_balance FROM participants WHERE id = ${topup.participant_id} LIMIT 1`
      if (!participant) return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })

      const newBalance = Number(participant.account_balance || 0) + Number(topup.amount)

      await sql`UPDATE participants SET account_balance = ${newBalance}, updated_at = NOW() WHERE id = ${topup.participant_id}`
      await sql`
        UPDATE topup_requests
        SET status = 'completed', reviewed_at = NOW(), reviewed_by_email = ${adminEmail}, admin_notes = ${adminNotes || null}
        WHERE id = ${requestId}
      `
      await sql`
        INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details)
        VALUES (${topup.participant_id}, ${topup.participant_email}, 'topup_approved', 'wallet',
          ${'Admin ' + adminEmail + ' approved $' + topup.amount + ' top-up. New balance: $' + newBalance})
      `
      return NextResponse.json({ success: true, message: "Top-up approved and wallet credited", newBalance })
    }

    // reject
    await sql`
      UPDATE topup_requests
      SET status = 'rejected', reviewed_at = NOW(), reviewed_by_email = ${adminEmail},
          rejection_reason = ${rejectionReason || "No reason provided"}, admin_notes = ${adminNotes || null}
      WHERE id = ${requestId}
    `
    await sql`
      INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details)
      VALUES (${topup.participant_id}, ${topup.participant_email}, 'topup_rejected', 'wallet',
        ${'Admin ' + adminEmail + ' rejected $' + topup.amount + ' top-up. Reason: ' + (rejectionReason || "Not specified")})
    `
    return NextResponse.json({ success: true, message: "Top-up rejected" })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const requests = await sql`SELECT * FROM topup_requests ORDER BY created_at DESC`
    return NextResponse.json({ success: true, requests })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
