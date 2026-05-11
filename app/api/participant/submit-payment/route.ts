import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { uploadBase64ToR2 } from "@/lib/cloudflare-r2"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { email, paymentMethod, screenshot, transactionHash, bep20Address, amount, status: reqStatus } = body

    if (!email || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // --- Contribution request (no screenshot/hash yet) ---
    if (reqStatus === "request_pending" || (!screenshot && !transactionHash)) {
      const participants = await query(
        "SELECT id FROM participants WHERE email = $1 LIMIT 1",
        [email.toLowerCase().trim()]
      ) as any[]
      const participant = participants[0]
      if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

      const rows = await query(
        `INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, status)
         VALUES ($1, $2, $3, $4, 'request_pending') RETURNING id`,
        [participant.id, email.toLowerCase().trim(), amount || 100, paymentMethod]
      ) as any[]

      return NextResponse.json({ success: true, submissionId: rows[0]?.id, message: "Contribution request submitted" })
    }

    // --- Full payment proof submission ---
    if (!screenshot || !transactionHash) {
      return NextResponse.json({ error: "Screenshot and transaction hash required" }, { status: 400 })
    }

    const dupCheck = await query(
      "SELECT id, status FROM payment_submissions WHERE transaction_id = $1",
      [transactionHash]
    ) as any[]
    if (dupCheck.length > 0) {
      return NextResponse.json(
        { error: "Transaction hash already submitted", existingSubmissionId: dupCheck[0].id, existingStatus: dupCheck[0].status },
        { status: 409 }
      )
    }

    const participants = await query(
      "SELECT id FROM participants WHERE email = $1 LIMIT 1",
      [email.toLowerCase().trim()]
    ) as any[]
    const participant = participants[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const screenshotData = typeof screenshot === "string" ? screenshot : await (screenshot as any).text()

    // Upload screenshot to R2
    let screenshotUrl = screenshotData
    if (screenshotData.startsWith("data:")) {
      try {
        const mimeType = screenshotData.match(/data:([^;]+)/)?.[1] || "image/jpeg"
        const fileName = `payment-${participant.id}-${transactionHash.slice(0, 8)}-${Date.now()}.${mimeType.split("/")[1] || "jpg"}`
        const uploadedUrl = await uploadBase64ToR2(screenshotData, fileName, mimeType)
        if (uploadedUrl) {
          screenshotUrl = uploadedUrl
        }
        // If uploadedUrl is null, keep original base64Data
      } catch (uploadErr) {
        console.error("[submit-payment] R2 upload failed:", uploadErr)
        // Continue with base64 storage as fallback
      }
    }

    const rows = await query(
      `INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, screenshot_url, transaction_id, status)
       VALUES ($1, $2, 100, $3, $4, $5, 'pending') RETURNING id, amount`,
      [participant.id, email.toLowerCase().trim(), paymentMethod || "USDT_BEP20", screenshotUrl, transactionHash]
    ) as any[]
    const submission = rows[0]
    if (!submission) return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })

    if (bep20Address) {
      await execute("UPDATE participants SET bep20_address = $1 WHERE email = $2", [bep20Address, email]).catch(() => {})
    }

    await execute(
      "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      ["payment_submitted", participant.id, email, "payment", `Payment $${submission.amount} via ${paymentMethod} TxHash: ${transactionHash}`]
    ).catch(() => {})

    return NextResponse.json({ success: true, submissionId: submission.id, message: "Payment proof submitted successfully" })
  } catch (error) {
    console.error("[v0] Payment submission error:", error)
    return NextResponse.json({ error: "Failed to submit payment", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const submissions = await query("SELECT * FROM payment_submissions ORDER BY created_at DESC") as any[]
    const mapped = submissions.map((s: any) => ({
      id: s.id, participantEmail: s.participant_email, participantId: s.participant_id,
      amount: s.amount, paymentMethod: s.payment_method, screenshotUrl: s.screenshot_url,
      transactionId: s.transaction_id, status: s.status, submittedAt: s.created_at,
      reviewedAt: s.reviewed_at, reviewedBy: s.reviewed_by, rejectionReason: s.rejection_reason,
      matchedPayoutId: s.matched_payout_id,
    }))
    return NextResponse.json({
      submissions: mapped, total: mapped.length,
      pending: mapped.filter((s: any) => s.status === "pending").length,
      confirmed: mapped.filter((s: any) => s.status === "confirmed").length,
      rejected: mapped.filter((s: any) => s.status === "rejected").length,
    })
  } catch {
    return NextResponse.json({ submissions: [], total: 0, pending: 0, confirmed: 0, rejected: 0 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    // Participant submitting payment proof for a matched contribution
    if (body.contributionId) {
      const { contributionId, transactionHash, screenshotUrl, note } = body
      const rows = await query(
        `UPDATE payment_submissions SET transaction_id=$1, screenshot_url=$2, status='proof_submitted', admin_notes=$3 WHERE id=$4 RETURNING id, status`,
        [transactionHash, screenshotUrl, note || null, contributionId]
      ) as any[]
      if (!rows[0]) return NextResponse.json({ error: "Submission not found" }, { status: 404 })
      return NextResponse.json({ success: true, submission: rows[0] })
    }

    // Admin updating submission status
    const { submissionId, status, reviewedBy, rejectionReason } = body
    const rows = await query(
      `UPDATE payment_submissions SET status=$1, reviewed_at=NOW(), reviewed_by=$2, rejection_reason=$3 WHERE id=$4 RETURNING *`,
      [status, reviewedBy || "admin", rejectionReason || null, submissionId]
    ) as any[]
    const submission = rows[0]
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })

    if (status === "confirmed") {
      const parts = await query("SELECT * FROM participants WHERE email = $1", [submission.participant_email]) as any[]
      const participant = parts[0]
      if (participant) {
        const newBalance = Number(participant.account_balance || 0) + 200
        await execute(
          "UPDATE participants SET status='active', is_active=true, account_balance=$1, activation_date=NOW() WHERE email=$2",
          [newBalance, submission.participant_email]
        ).catch(() => {})
      }
    }

    await execute(
      "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ($1,'admin',$2,'payment',$3)",
      [status === "confirmed" ? "approve_payment" : "reject_payment", reviewedBy || "admin@system.com",
       `Payment ${status} for ${submission.participant_email} - $${submission.amount}`]
    ).catch(() => {})

    return NextResponse.json({ success: true, submission: { id: submission.id, status: submission.status } })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}
