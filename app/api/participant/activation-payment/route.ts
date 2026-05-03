import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string
    const wallet = formData.get("wallet") as string
    const paymentMethod = formData.get("paymentMethod") as string
    const transactionId = formData.get("transactionId") as string

    if (!email || !wallet) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

    const existing = await sql`SELECT id FROM payment_submissions WHERE participant_email = ${email} AND status IN ('pending','approved') LIMIT 1`
    if (existing.length > 0) return NextResponse.json({ success: false, error: "Activation payment already submitted or approved" }, { status: 409 })

    const participant = await sql`SELECT id FROM participants WHERE email = ${email} LIMIT 1`
    await sql`
      INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, transaction_id, status)
      VALUES (${participant[0]?.id || null}, ${email}, 100, ${paymentMethod || 'BEP20'}, ${transactionId || null}, 'pending')
    `
    await sql`UPDATE participants SET status = 'pending_activation', wallet_address = ${wallet}, updated_at = NOW() WHERE email = ${email}`
    await sql`INSERT INTO notifications (user_email, type, title, message) VALUES ('admin', 'info', 'Activation Payment Submitted', ${`${email} submitted activation payment for review.`})`

    return NextResponse.json({ success: true, message: "Activation payment submitted for review", status: "pending" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
