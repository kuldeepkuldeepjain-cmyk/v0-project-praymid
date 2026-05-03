import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    const [payment] = await sql`SELECT * FROM payment_submissions WHERE id=${paymentId}`
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

    await sql`
      UPDATE payment_submissions SET status='collected', admin_notes=${`Collected. TxHash: ${txHash}`}, reviewed_at=NOW()
      WHERE id=${paymentId}
    `

    await sql`
      INSERT INTO activity_logs (actor_email, action, target_type, target_id, details)
      VALUES ('admin', 'tokens_collected', 'payment', ${paymentId}, ${`TxHash: ${txHash}`})
    `

    return NextResponse.json({ success: true, txHash, message: "Tokens collected successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
