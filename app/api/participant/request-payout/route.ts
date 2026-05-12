import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "email required" }, { status: 400 })

    // Only select columns that actually exist in payout_requests
    const payouts = await query(
      `SELECT id, amount, status, wallet_address, created_at,
              payout_method, transaction_hash, admin_notes,
              matched_contribution_id, matched_at, processed_at
       FROM payout_requests
       WHERE participant_email = $1
       ORDER BY created_at DESC`,
      [email]
    ) as any[]

    return NextResponse.json({ success: true, payouts })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payout history" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { email, amount, bep20_address, wallet_address } = body
    const walletAddr = bep20_address || wallet_address

    if (!email || !amount || !walletAddr) {
      return NextResponse.json({ success: false, error: "Missing required fields (email, amount, wallet address)" }, { status: 400 })
    }

    // Load participant with cooldown info
    const rows = await query(
      "SELECT id, account_balance, next_contribution_date FROM participants WHERE email = $1 LIMIT 1",
      [email.toLowerCase().trim()]
    ) as any[]
    const participant = rows[0]
    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    // 30-day cooldown check
    if (participant.next_contribution_date) {
      const cooldownUntil = new Date(participant.next_contribution_date)
      if (cooldownUntil > new Date()) {
        const daysLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return NextResponse.json({
          success: false,
          error: `Your next contribution is available in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          cooldown: true,
          next_contribution_date: cooldownUntil.toISOString(),
          days_remaining: daysLeft,
        }, { status: 429 })
      }
    }

    const currentBalance = Number(participant.account_balance) || 0
    if (currentBalance < Number(amount)) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${Number(amount).toFixed(2)}`,
      }, { status: 400 })
    }

    const newBalance = currentBalance - Number(amount)

    // Deduct balance and save wallet address (column is wallet_address)
    await execute(
      "UPDATE participants SET account_balance = $1, wallet_address = $2 WHERE email = $3",
      [newBalance, walletAddr, email.toLowerCase().trim()]
    )

    // Insert payout request
    const payoutRows = await query(
      `INSERT INTO payout_requests
         (participant_id, participant_email, wallet_address, amount, status, payout_method)
       VALUES ($1, $2, $3, $4, 'pending', 'BEP20')
       RETURNING id`,
      [participant.id, email.toLowerCase().trim(), walletAddr, Number(amount)]
    ) as any[]
    const payoutRequest = payoutRows[0]

    // Activity log (non-critical)
    await execute(
      "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ($1,'payout_requested',$2,'payout_request')",
      [email, `Requested payout of $${Number(amount).toFixed(2)} to ${walletAddr}`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Payout request submitted successfully",
      newBalance,
      requestId: payoutRequest.id,
    })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to submit payout request. Please try again." }, { status: 500 })
  }
}
