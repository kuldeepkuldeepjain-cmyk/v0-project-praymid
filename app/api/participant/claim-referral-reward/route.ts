import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const REFERRAL_TARGET = 50
const REWARD_AMOUNT = 20

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, userId } = await request.json()

    if (!email || !userId) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

    const [participant] = await sql`SELECT account_balance FROM participants WHERE email=${email}`
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const invites = await sql`
      SELECT id FROM invite_logs WHERE participant_id=${userId} AND invite_method='app_share'
    `

    const joinedCount = invites.length
    if (joinedCount < REFERRAL_TARGET) {
      return NextResponse.json({ success: false, error: `Only ${joinedCount}/${REFERRAL_TARGET} referrals joined` }, { status: 400 })
    }

    const currentBalance = Number(participant.account_balance || 0)
    const newBalance = currentBalance + REWARD_AMOUNT

    await sql`UPDATE participants SET account_balance=${newBalance} WHERE email=${email}`

    await sql`
      INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after, reference_id)
      VALUES (${email}, 'credit', ${REWARD_AMOUNT}, ${'Referral reward - ' + REFERRAL_TARGET + ' friends joined'},
        ${currentBalance}, ${newBalance}, ${'ref-reward-' + userId})
    `

    await sql`
      INSERT INTO activity_logs (actor_email, actor_id, action, details, target_type)
      VALUES (${email}, ${userId}, 'referral_reward_claimed',
        ${'Claimed $' + REWARD_AMOUNT + ' referral reward for ' + REFERRAL_TARGET + ' successful referrals'},
        'referral_reward')
    `

    return NextResponse.json({ success: true, amount: REWARD_AMOUNT, newBalance })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
