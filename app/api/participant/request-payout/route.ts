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

    // Load participant balance info
    const rows = await query(
      "SELECT id, account_balance FROM participants WHERE email = $1 LIMIT 1",
      [email.toLowerCase().trim()]
    ) as any[]
    const participant = rows[0]
    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const currentBalance = Number(participant.account_balance) || 0
    if (currentBalance < Number(amount)) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${Number(amount).toFixed(2)}`,
      }, { status: 400 })
    }

    const newBalance = currentBalance - Number(amount)

    // Deduct balance and save wallet address (no cooldown set on payout)
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

    // Credit $5 referral bonus to referrer after contribution completed (only once per referred user)
    const REFERRAL_BONUS = 5
    try {
      // Find the referrer by looking up who referred this participant
      const referrerRows = await query(
        `SELECT id, email, referral_earnings FROM participants 
         WHERE referral_code = (SELECT referred_by FROM participants WHERE email = $1)`,
        [email.toLowerCase().trim()]
      ) as any[]
      
      const referrer = referrerRows[0]
      if (referrer) {
        // Check if bonus was already given for this referred user
        const bonusCheckRows = await query(
          `SELECT id FROM referral_bonuses WHERE referred_email = $1 AND referrer_id = $2`,
          [email.toLowerCase().trim(), referrer.id]
        ) as any[]
        
        // Only add bonus if it hasn't been added yet
        if (bonusCheckRows.length === 0) {
          const referrerNewEarnings = Number(referrer.referral_earnings || 0) + REFERRAL_BONUS
          
          // Update referrer's referral_earnings
          await execute(
            `UPDATE participants SET referral_earnings = $1 WHERE id = $2`,
            [referrerNewEarnings, referrer.id]
          )
          
          // Log the referral bonus transaction
          await execute(
            `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
             VALUES ($1, 'referral_bonus', $2, $3, $4, $5)`,
            [referrer.email, REFERRAL_BONUS, `Referral bonus - ${email} completed contribution`, Number(referrer.referral_earnings || 0), referrerNewEarnings]
          ).catch(() => {})
          
          // Track that bonus was given for this referred user
          await execute(
            `INSERT INTO referral_bonuses (referred_email, referrer_id, bonus_amount, given_date) VALUES ($1, $2, $3, NOW())`,
            [email.toLowerCase().trim(), referrer.id, REFERRAL_BONUS]
          ).catch(() => {})
        }
      }
    } catch (referralError) {
      // Non-critical - don't fail the payout if referral credit fails
      console.error("Failed to credit referral bonus:", referralError)
    }

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
