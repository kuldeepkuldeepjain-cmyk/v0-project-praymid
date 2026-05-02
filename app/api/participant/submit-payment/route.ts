import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { scheduleContributionAutoMatch } from "@/lib/contribution-scheduler"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.json()
    const { email, paymentMethod, screenshot, transactionHash, bep20Address } = formData

    if (!email || !paymentMethod || !screenshot || !transactionHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Duplicate check
    const existing = await sql`SELECT id, status FROM payment_submissions WHERE transaction_id = ${transactionHash} LIMIT 1`
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Transaction hash already submitted",
          message: "This transaction ID has already been submitted.",
          existingSubmissionId: existing[0].id,
          existingStatus: existing[0].status,
        },
        { status: 409 },
      )
    }

    const [participant] = await sql`SELECT id, username FROM participants WHERE email = ${email} LIMIT 1`
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const screenshotData = typeof screenshot === "string" ? screenshot : await (screenshot as any).text()

    const [submission] = await sql`
      INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, screenshot_url, transaction_id, status)
      VALUES (${participant.id}, ${email}, 100, ${paymentMethod || "USDT_BEP20"}, ${screenshotData}, ${transactionHash}, 'pending')
      RETURNING *
    `

    if (!submission) return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })

    if (bep20Address) {
      await sql`UPDATE participants SET bep20_address = ${bep20Address} WHERE email = ${email}`
    }

    await sql`
      INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details)
      VALUES ('payment_submitted', ${participant.id}, ${email}, 'payment',
        ${'Payment $' + submission.amount + ' via ' + paymentMethod + ' - TxHash: ' + transactionHash})
    `

    const scheduleResult = await scheduleContributionAutoMatch(submission.id, email, 1800)

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: "Payment proof submitted successfully",
    })
  } catch (error: any) {
    if (error?.message?.includes("unique") || error?.message?.includes("duplicate") || error?.code === "23505") {
      return NextResponse.json(
        { error: "Duplicate transaction hash", message: "This transaction has already been submitted." },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: "Failed to submit payment", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.replace("Bearer ", "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const submissions = await sql`SELECT * FROM payment_submissions ORDER BY created_at DESC`

    const formatted = submissions.map((s: any) => ({
      id: s.id,
      participantEmail: s.participant_email,
      participantId: s.participant_id,
      amount: s.amount,
      paymentMethod: s.payment_method,
      screenshotUrl: s.screenshot_url,
      transactionId: s.transaction_id,
      status: s.status,
      submittedAt: s.created_at,
      reviewedAt: s.reviewed_at,
      reviewedBy: s.reviewed_by_email,
      rejectionReason: s.rejection_reason,
      matchedPayoutId: s.matched_payout_id,
    }))

    return NextResponse.json({
      submissions: formatted,
      total: formatted.length,
      pending: formatted.filter((s: any) => s.status === "pending").length,
      confirmed: formatted.filter((s: any) => s.status === "confirmed").length,
      rejected: formatted.filter((s: any) => s.status === "rejected").length,
    })
  } catch (error) {
    return NextResponse.json({ submissions: [], total: 0, pending: 0, confirmed: 0, rejected: 0 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.replace("Bearer ", "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { submissionId, status, reviewedBy, rejectionReason } = await request.json()

    const [submission] = await sql`
      UPDATE payment_submissions SET
        status = ${status},
        reviewed_at = NOW(),
        reviewed_by_email = ${reviewedBy || null},
        rejection_reason = ${rejectionReason || null}
      WHERE id = ${submissionId}
      RETURNING *
    `
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

    if (status === "confirmed") {
      const [participant] = await sql`
        SELECT id, username, email, account_balance, total_earnings, wallet_address
        FROM participants WHERE email = ${submission.participant_email} LIMIT 1
      `
      if (participant) {
        const newBalance = Number(participant.account_balance || 0) + 200
        const newEarnings = Number(participant.total_earnings || 0) + 200
        await sql`
          UPDATE participants SET
            status = 'active', is_active = true,
            account_balance = ${newBalance}, total_earnings = ${newEarnings},
            activation_date = NOW()
          WHERE email = ${submission.participant_email}
        `
        if (participant.wallet_address) {
          await sql`
            INSERT INTO wallet_pool (assigned_to, wallet_address, network, balance, status)
            VALUES (${participant.id}, ${participant.wallet_address}, 'BEP20', 100, 'active')
            ON CONFLICT (wallet_address) DO NOTHING
          `.catch(() => {})
        }
      }
    }

    await sql`
      INSERT INTO activity_logs (action, actor_email, target_type, details)
      VALUES (${status === "confirmed" ? "approve_payment" : "reject_payment"},
        ${reviewedBy || "admin@system.com"}, 'payment',
        ${'Payment ' + status + ' for ' + submission.participant_email + ' - $' + submission.amount + (rejectionReason ? ' (Reason: ' + rejectionReason + ')' : '')})
    `.catch(() => {})

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        participantId: submission.participant_id,
        participantEmail: submission.participant_email,
        amount: submission.amount,
        status: submission.status,
        createdAt: submission.created_at,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}
