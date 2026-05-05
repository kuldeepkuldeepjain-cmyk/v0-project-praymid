import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
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

    const db = getPool()!

    // Check duplicate
    const dupCheck = await db.query("SELECT id, status FROM payment_submissions WHERE transaction_id = $1", [transactionHash])
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ error: "Transaction hash already submitted", existingSubmissionId: dupCheck.rows[0].id, existingStatus: dupCheck.rows[0].status }, { status: 409 })
    }

    // Get participant
    const pRes = await db.query("SELECT id, username FROM participants WHERE email = $1", [email.toLowerCase().trim()])
    const participant = pRes.rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const screenshotData = typeof screenshot === "string" ? screenshot : await (screenshot as any).text()

    // Insert submission
    const insRes = await db.query(
      `INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, screenshot_url, transaction_id, status)
       VALUES ($1, $2, 100, $3, $4, $5, 'pending') RETURNING *`,
      [participant.id, email, paymentMethod || "USDT_BEP20", screenshotData, transactionHash]
    )
    const submission = insRes.rows[0]
    if (!submission) return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })

    if (bep20Address) {
      await db.query("UPDATE participants SET bep20_address = $1 WHERE email = $2", [bep20Address, email]).catch(() => {})
    }

    await db.query(
      "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      ["payment_submitted", participant.id, email, "payment", `Payment $${submission.amount} via ${paymentMethod} TxHash: ${transactionHash}`]
    ).catch(() => {})

    const scheduleResult = await scheduleContributionAutoMatch(submission.id, email, 1800)
    if (!scheduleResult.success) console.warn("[v0] Auto-match schedule failed:", scheduleResult.error)

    return NextResponse.json({ success: true, submissionId: submission.id, message: "Payment proof submitted successfully" })
  } catch (error) {
    console.error("[v0] Payment submission error:", error)
    return NextResponse.json({ error: "Failed to submit payment", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const db = getPool()!
    const result = await db.query("SELECT * FROM payment_submissions ORDER BY created_at DESC")
    const submissions = result.rows.map((s: any) => ({
      id: s.id, participantEmail: s.participant_email, participantId: s.participant_id,
      amount: s.amount, paymentMethod: s.payment_method, screenshotUrl: s.screenshot_url,
      transactionId: s.transaction_id, status: s.status, submittedAt: s.created_at,
      reviewedAt: s.reviewed_at, reviewedBy: s.reviewed_by, rejectionReason: s.rejection_reason,
      matchedPayoutId: s.matched_payout_id,
    }))
    return NextResponse.json({
      submissions, total: submissions.length,
      pending: submissions.filter((s: any) => s.status === "pending").length,
      confirmed: submissions.filter((s: any) => s.status === "confirmed").length,
      rejected: submissions.filter((s: any) => s.status === "rejected").length,
    })
  } catch (error) {
    return NextResponse.json({ submissions: [], total: 0, pending: 0, confirmed: 0, rejected: 0 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { submissionId, status, reviewedBy, rejectionReason } = await request.json()
    const db = getPool()!

    const updRes = await db.query(
      `UPDATE payment_submissions SET status=$1, reviewed_at=NOW(), reviewed_by=$2, rejection_reason=$3 WHERE id=$4 RETURNING *`,
      [status, reviewedBy || "admin", rejectionReason || null, submissionId]
    )
    const submission = updRes.rows[0]
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

    if (status === "confirmed") {
      const pRes = await db.query("SELECT * FROM participants WHERE email = $1", [submission.participant_email])
      const participant = pRes.rows[0]
      if (participant) {
        const newBalance = Number(participant.account_balance || 0) + 200
        const newEarnings = Number(participant.total_earnings || 0) + 200
        await db.query(
          "UPDATE participants SET status='active', is_active=true, account_balance=$1, total_earnings=$2, activation_date=NOW() WHERE email=$3",
          [newBalance, newEarnings, submission.participant_email]
        ).catch(() => {})
        if (participant.wallet_address) {
          await db.query(
            "INSERT INTO wallet_pool (assigned_to, wallet_address, network, balance, status) VALUES ($1,$2,'BEP20',100,'active') ON CONFLICT DO NOTHING",
            [participant.id, participant.wallet_address]
          ).catch(() => {})
        }
      }
    }

    await db.query(
      "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ($1,'admin',$2,'payment',$3)",
      [status === "confirmed" ? "approve_payment" : "reject_payment", reviewedBy || "admin@system.com",
       `Payment ${status} for ${submission.participant_email} - $${submission.amount}`]
    ).catch(() => {})

    return NextResponse.json({ success: true, submission: { id: submission.id, status: submission.status } })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}
