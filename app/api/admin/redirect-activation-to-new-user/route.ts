import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentId, amount, email } = await request.json()
    const db = getPool()!

    const pRes = await db.query("SELECT id, email, username, account_balance, next_contribution_date FROM participants ORDER BY created_at DESC LIMIT 1")
    if (!pRes.rows.length) {
      return NextResponse.json({ success: false, error: "No participants available to redirect to" }, { status: 404 })
    }
    const next = pRes.rows[0]

    // Check cooldown before redirecting activation funds
    if (next.next_contribution_date) {
      const cooldownUntil = new Date(next.next_contribution_date)
      if (cooldownUntil > new Date()) {
        const daysLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        console.log(`[v0] Cannot redirect activation to ${next.email}: cooldown active, ${daysLeft} days remaining`)
        return NextResponse.json({
          success: false,
          error: `Target participant (${next.email}) is on cooldown. Activation cannot be redirected. Next contribution available in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          cooldown: true,
          days_remaining: daysLeft,
        }, { status: 429 })
      }
    }

    const newBalance = Number(next.account_balance || 0) + Number(amount)

    // Calculate next contribution date (30 days from now) when activation is redirected
    const nextContributionDate = new Date()
    nextContributionDate.setDate(nextContributionDate.getDate() + 30)

    await db.query("UPDATE participants SET account_balance = $1, next_contribution_date = $2, updated_at = NOW() WHERE id = $3", [newBalance, nextContributionDate.toISOString(), next.id])
    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, description) VALUES ($1,'contribution_redirect',$2,$3)",
      [next.email, Number(amount), `Redirected activation payment from ${email}`]
    )
    await db.query(
      "UPDATE payment_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [paymentId]
    )

    const notifDate = nextContributionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Funds Received',$2)",
      [next.email, `You received $${amount} in redirected activation funds. Your next contribution will be available on ${notifDate}.`]
    )

    return NextResponse.json({ success: true, message: `Activation payment redirected to ${next.username}`, recipientEmail: next.email, amount })
  } catch (error) {
    console.error("[v0] Error in redirect activation API:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
