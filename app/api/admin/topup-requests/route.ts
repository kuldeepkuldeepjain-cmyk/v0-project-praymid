import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, participant_email, participant_id, amount, status, created_at,
              payment_method, transaction_id, admin_notes, bep20_address, screenshot_url,
              rejection_reason, reviewed_at, reviewed_by_email
       FROM topup_requests ORDER BY created_at DESC`
    )
    return NextResponse.json({ success: true, requests: rows })
  } catch (error) {
    console.error("[topup-requests] GET error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { requestId, bep20_address } = await req.json()
    if (!requestId) {
      return NextResponse.json({ success: false, message: "Missing requestId" }, { status: 400 })
    }

    await execute(
      "UPDATE topup_requests SET bep20_address = $1 WHERE id = $2",
      [bep20_address?.trim() || null, requestId]
    )
    return NextResponse.json({ success: true, message: "BEP20 address updated" })
  } catch (error) {
    console.error("[topup-requests] PATCH error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { requestId, action, adminEmail, adminNotes, rejectionReason } = await req.json()
    if (!requestId || !action || !adminEmail) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
    }

    const rows = await query("SELECT * FROM topup_requests WHERE id = $1", [requestId])
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 })
    }

    const topup = rows[0] as any
    if (topup.status !== "pending") {
      return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 })
    }

    if (action === "approve") {
      const pRows = await query("SELECT account_balance FROM participants WHERE id = $1", [topup.participant_id])
      if (!pRows.length) {
        return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })
      }

      const newBalance = Number((pRows[0] as any).account_balance || 0) + Number(topup.amount)
      await execute(
        "UPDATE participants SET account_balance = $1 WHERE id = $2",
        [newBalance, topup.participant_id]
      )
      await execute(
        "UPDATE topup_requests SET status = 'completed', reviewed_at = NOW(), reviewed_by_email = $1, admin_notes = $2 WHERE id = $3",
        [adminEmail, adminNotes || null, requestId]
      )
      await execute(
        "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
        [topup.participant_id, topup.participant_email, "topup_approved", "wallet", `Admin ${adminEmail} approved $${topup.amount} top-up`]
      ).catch(() => {})

      // Credit $5 to referrer if this participant was referred
      const referrerRows = await query(
        `SELECT id, email, referral_earnings FROM participants WHERE referral_code = (SELECT referred_by FROM participants WHERE email = $1)`,
        [topup.participant_email]
      )
      if (referrerRows.length > 0) {
        const referrer = referrerRows[0] as any
        const referrerBonus = 5 // $5 per referral
        const referrerNewEarnings = Number(referrer.referral_earnings || 0) + referrerBonus
        await execute(
          `UPDATE participants SET referral_earnings = $1 WHERE id = $2`,
          [referrerNewEarnings, referrer.id]
        )
        await execute(
          `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
           VALUES ($1, 'credit', $2, $3, $4, $5)`,
          [referrer.email, referrerBonus, `Referral bonus - ${topup.participant_email} added funds`, Number(referrer.referral_earnings || 0), referrerNewEarnings]
        ).catch(() => {})
        await execute(
          `INSERT INTO activity_logs(actor_email, action, details, target_type) VALUES ($1, 'referral_bonus_credited', $2, 'referral_bonus')`,
          [referrer.email, `Earned $5 referral bonus from ${topup.participant_email} adding funds`]
        ).catch(() => {})
      }

      return NextResponse.json({ success: true, message: "Top-up approved and wallet credited", newBalance })
    }

    await execute(
      "UPDATE topup_requests SET status = 'rejected', reviewed_at = NOW(), reviewed_by_email = $1, rejection_reason = $2, admin_notes = $3 WHERE id = $4",
      [adminEmail, rejectionReason || null, adminNotes || null, requestId]
    )
    await execute(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      [topup.participant_id, topup.participant_email, "topup_rejected", "wallet", `Admin ${adminEmail} rejected $${topup.amount} top-up`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Top-up rejected" })
  } catch (error) {
    console.error("[topup-requests] POST error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
