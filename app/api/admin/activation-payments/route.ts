import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const payments = await sql`
      SELECT ps.*, p.username, p.wallet_address
      FROM payment_submissions ps
      LEFT JOIN participants p ON ps.participant_id = p.id
      ORDER BY ps.created_at DESC
    `

    const transformed = payments.map((payment: any) => ({
      id: payment.id,
      email: payment.participant_email,
      username: payment.username || payment.participant_email?.split("@")[0] || "Unknown",
      wallet: payment.wallet_address || "",
      amount: Number(payment.amount) || 100,
      paymentMethod: payment.payment_method === "BEP20" ? "crypto" : "bank",
      screenshotUrl: payment.screenshot_url || "",
      transactionHash: payment.transaction_id || "",
      submittedAt: payment.created_at,
      status: payment.status || "pending",
    }))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return NextResponse.json({
      success: true,
      payments: transformed,
      stats: {
        pending: transformed.filter((p: any) => p.status === "pending" || p.status === "request_pending").length,
        approved_today: transformed.filter((p: any) => p.status === "approved" && new Date(p.submittedAt) >= today).length,
        rejected_today: transformed.filter((p: any) => p.status === "rejected" && new Date(p.submittedAt) >= today).length,
        total_collected: transformed.filter((p: any) => p.status === "approved").reduce((s: number, p: any) => s + p.amount, 0),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { paymentId, action, reason } = await request.json()

    if (!paymentId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const [payment] = await sql`SELECT * FROM payment_submissions WHERE id = ${paymentId} LIMIT 1`
    if (!payment) return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })

    if (payment.status !== "pending" && payment.status !== "request_pending") {
      return NextResponse.json({
        success: false,
        error: "This payment has already been processed.",
        currentStatus: payment.status,
        alreadyProcessed: true,
      }, { status: 400 })
    }

    // Atomic update — only succeeds if still pending
    const updated = await sql`
      UPDATE payment_submissions
      SET status = ${action === "approve" ? "approved" : "rejected"},
          reviewed_at = NOW(),
          rejection_reason = ${action === "reject" ? (reason || null) : null}
      WHERE id = ${paymentId} AND status IN ('pending', 'request_pending')
      RETURNING *
    `
    if (!updated.length) {
      return NextResponse.json({ success: false, error: "Payment was already processed by another request", alreadyProcessed: true }, { status: 409 })
    }

    if (action === "approve") {
      const [participant] = await sql`SELECT account_balance FROM participants WHERE email = ${payment.participant_email} LIMIT 1`
      const newBalance = Number(participant?.account_balance || 0) + 180
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 30)

      await sql`
        UPDATE participants SET status = 'active', is_active = true, activation_date = NOW(),
          account_balance = ${newBalance}, next_contribution_date = ${nextDate.toISOString()}
        WHERE email = ${payment.participant_email}
      `
      await sql`
        INSERT INTO notifications (user_email, type, title, message, read_status)
        VALUES (${payment.participant_email}, 'success', 'Activation Approved',
          'Your contribution has been approved. $180 has been credited to your account. Next contribution available after 30 days.', false)
      `
    } else {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 30)
      await sql`UPDATE participants SET next_contribution_date = ${nextDate.toISOString()} WHERE email = ${payment.participant_email}`
      await sql`
        INSERT INTO notifications (user_email, type, title, message, read_status)
        VALUES (${payment.participant_email}, 'error', 'Activation Payment Rejected',
          ${(reason || "Your activation payment was rejected") + ". You can try again after 30 days."}, false)
      `
    }

    await sql`
      INSERT INTO activity_logs (actor_email, action, target_type, details)
      VALUES ('admin', ${action === "approve" ? "activation_approved" : "activation_rejected"}, 'payment_submission',
        ${JSON.stringify({ paymentId, reason })})
    `.catch(() => {})

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Payment approved, account activated" : "Payment rejected",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
