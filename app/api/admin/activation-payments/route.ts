import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const result = await db.query(`
      SELECT ps.*, p.username, p.wallet_address
      FROM payment_submissions ps
      LEFT JOIN participants p ON p.id = ps.participant_id
      ORDER BY ps.created_at DESC
    `)
    const payments = result.rows

    const transformedPayments = payments.map((payment: any) => ({
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

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const pendingCount = transformedPayments.filter((p: any) => p.status === "pending" || p.status === "request_pending").length
    const approvedToday = transformedPayments.filter((p: any) => p.status === "approved" && new Date(p.submittedAt) >= today).length
    const rejectedToday = transformedPayments.filter((p: any) => p.status === "rejected" && new Date(p.submittedAt) >= today).length
    const totalCollected = transformedPayments.filter((p: any) => p.status === "approved").reduce((sum: number, p: any) => sum + p.amount, 0)

    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      stats: { pending: pendingCount, approved_today: approvedToday, rejected_today: rejectedToday, total_collected: totalCollected },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const { paymentId, action, reason } = await request.json()

    if (!paymentId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Missing or invalid fields" }, { status: 400 })
    }

    const paymentRes = await db.query(`SELECT * FROM payment_submissions WHERE id = $1`, [paymentId])
    const payment = paymentRes[0]
    if (!payment) return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })

    if (payment.status !== "pending" && payment.status !== "request_pending") {
      return NextResponse.json({ success: false, error: "Payment already processed", alreadyProcessed: true }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"
    const updated = await db.query(
      `UPDATE payment_submissions SET status=$1, reviewed_at=NOW(), rejection_reason=?WHERE id=?AND status IN ('pending','request_pending') RETURNING id`,
      [newStatus, action === "reject" ? (reason || null) : null, paymentId]
    )
    if (updated.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Payment was already processed", alreadyProcessed: true }, { status: 409 })
    }

    if (action === "approve") {
      const partRes = await db.query(`SELECT account_balance FROM participants WHERE email=$1`, [payment.participant_email])
      const currentBalance = Number(partRes[0]?.account_balance || 0)
      const newBalance = currentBalance + 150
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 30)
      await db.query(
        `UPDATE participants SET status='active', is_active=true, activation_date=NOW(), account_balance=$1, next_contribution_date=?WHERE email=$3`,
        [newBalance, nextDate.toISOString(), payment.participant_email]
      )
      await db.query(
        `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'success','Activation Approved','Your contribution has been approved. $150 has been credited to your account.',false)`,
        [payment.participant_email]
      )
    } else {
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 30)
      await db.query(`UPDATE participants SET next_contribution_date=?WHERE email=$2`, [nextDate.toISOString(), payment.participant_email])
      await db.query(
        `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'error','Activation Payment Rejected',$2,false)`,
        [payment.participant_email, (reason || "Your activation payment was rejected") + ". You can try again after 30 days."]
      )
    }

    await db.query(
      `INSERT INTO activity_logs(actor_email,action,target_type,details) VALUES('admin@123',$1,'payment_submission',$2)`,
      [action === "approve" ? "activation_approved" : "activation_rejected", JSON.stringify({ paymentId, reason })]
    )

    return NextResponse.json({ success: true, message: action === "approve" ? "Payment approved, account activated" : "Payment rejected" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
