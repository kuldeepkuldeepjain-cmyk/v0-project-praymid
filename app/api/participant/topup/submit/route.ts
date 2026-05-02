import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, userEmail, amount, transactionHash, screenshotBase64, note } = await request.json()

    if (!userEmail || !amount || !transactionHash || !screenshotBase64) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 5) {
      return NextResponse.json({ success: false, message: "Invalid amount. Minimum is $5" }, { status: 400 })
    }

    // Prevent duplicate tx hash
    const [existingTx] = await sql`SELECT id FROM topup_requests WHERE transaction_id=${transactionHash}`
    if (existingTx) {
      return NextResponse.json({ success: false, message: "This transaction has already been submitted" }, { status: 400 })
    }

    const [participant] = await sql`SELECT id FROM participants WHERE email=${userEmail}`
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    await sql`
      INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, screenshot_url, admin_notes, payment_method, status)
      VALUES (${participant.id}, ${userEmail}, ${parsedAmount}, ${transactionHash}, ${screenshotBase64}, ${note || null}, 'crypto', 'pending')
    `

    await sql`
      INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details)
      VALUES (${participant.id}, ${userEmail}, 'topup_requested', 'wallet',
        ${'Submitted $' + parsedAmount + ' USDT top-up request (tx: ' + transactionHash.slice(0, 12) + '...)'})
    `

    return NextResponse.json({ success: true, message: "Top-up request submitted successfully" })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
