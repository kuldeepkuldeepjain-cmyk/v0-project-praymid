import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { getPool, withTransaction } from "@/lib/db"
import { getChallengePlan, getChallengeRewardAmount } from "@/lib/challenge-account"
import { enforceRateLimit, getActiveRestriction, getSecurityContext } from "@/lib/security"

const validNetworks = new Set(["BEP20", "ERC20", "TRC20"])

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  const rate = await enforceRateLimit("withdrawal", `challenge-reward:${auth.participantId}:${getSecurityContext(request).ipAddress || "unknown"}`)
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many requests. Try again shortly." }, { status: 429 })

  try {
    const body = await request.json()
    const network = String(body?.network || "").toUpperCase()
    const address = String(body?.address || "").trim()
    const addressIsValid = network === "TRC20"
      ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
      : /^0x[a-fA-F0-9]{40}$/.test(address)
    if (!validNetworks.has(network) || !addressIsValid) {
      return NextResponse.json({ success: false, message: "Enter a valid wallet address for the selected network." }, { status: 400 })
    }
    if (await getActiveRestriction(auth.email, "withdrawal")) {
      return NextResponse.json({ success: false, message: "Your account is under withdrawal review." }, { status: 403 })
    }
    const db = getPool()
    if (!db) return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 500 })

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, account_type, challenge_status, challenge_plan_key, challenge_passed_equity,
                account_frozen, is_frozen, status
         FROM participants WHERE id = $1 FOR UPDATE`,
        [auth.participantId],
      )
      const participant = rows[0]
      const plan = getChallengePlan(participant?.challenge_plan_key)
      if (!participant || participant.account_type !== "challenge" || participant.challenge_status !== "passed" || !plan || plan.key === "challenge_5k") {
        return { error: "This Challenge tier is not eligible for a cash reward.", status: 403 }
      }
      if (participant.account_frozen || participant.is_frozen || participant.status === "frozen") {
        return { error: "Reward requests are disabled for this account.", status: 403 }
      }
      const passedEquity = Number(participant.challenge_passed_equity)
      const amount = participant.challenge_passed_equity == null ? 0 : getChallengeRewardAmount(plan, passedEquity)
      if (amount <= 0) return { error: "A recorded passing profit is required. Contact support for older evaluation results.", status: 409 }
      const openTrades = await client.query(
        `SELECT id FROM forex_trades WHERE LOWER(participant_email) = LOWER($1) AND status = 'open' LIMIT 1`,
        [auth.email],
      )
      if (openTrades.rows.length) return { error: "Close all positions before requesting a reward.", status: 409 }
      const inserted = await client.query(
        `INSERT INTO challenge_reward_requests (participant_id, plan_key, passed_equity, eligible_amount, payout_method, wallet_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (participant_id) DO NOTHING RETURNING id, status, eligible_amount`,
        [participant.id, plan.key, passedEquity, amount, network, address],
      )
      if (!inserted.rows[0]) return { error: "A reward request already exists for this evaluation.", status: 409 }
      return { reward: inserted.rows[0] }
    })
    if ("error" in result) return NextResponse.json({ success: false, message: result.error }, { status: result.status })
    return NextResponse.json({ success: true, reward: result.reward }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, message: "Unable to submit reward request." }, { status: 500 })
  }
}
