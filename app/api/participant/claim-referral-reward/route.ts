import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const REFERRAL_TARGET = 40
const REWARD_AMOUNT = 200

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, userId } = await request.json()
    if (!email || !userId) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

    const db = getPool()!
    const { rows } = await db.query("SELECT account_balance FROM participants WHERE email = $1", [email])
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const { rows: invites } = await db.query(
      "SELECT id FROM invite_logs WHERE participant_id = $1", [userId]
    )
    const joinedCount = invites.length
    if (joinedCount < REFERRAL_TARGET) {
      return NextResponse.json({ success: false, error: `Only ${joinedCount}/${REFERRAL_TARGET} referrals joined` }, { status: 400 })
    }

    const newBalance = participant.account_balance + REWARD_AMOUNT
    await db.query("UPDATE participants SET account_balance = $1 WHERE email = $2", [newBalance, email])
    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1,'credit',$2,$3,$4,$5)",
      [email, REWARD_AMOUNT, `Referral reward - ${REFERRAL_TARGET} friends joined`, participant.account_balance, newBalance]
    )
    await db.query(
      "INSERT INTO activity_logs (actor_email, actor_id, action, details, target_type) VALUES ($1,$2,'referral_reward_claimed',$3,'referral_reward')",
      [email, userId, `Claimed $${REWARD_AMOUNT} referral reward for ${REFERRAL_TARGET} referrals`]
    )

    return NextResponse.json({ success: true, amount: REWARD_AMOUNT, newBalance })
  } catch (error) {
    console.error("[v0] Claim reward error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
