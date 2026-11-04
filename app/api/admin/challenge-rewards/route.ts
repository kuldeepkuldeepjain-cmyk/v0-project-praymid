import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool, withTransaction } from "@/lib/db"
import { getChallengePlan, getChallengeRewardAmount } from "@/lib/challenge-account"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()
    if (!db) return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 500 })
    const [claims, fundingReviews] = await Promise.all([
      db.query(
        `SELECT r.id, r.participant_id, p.email, r.plan_key, r.passed_equity, r.eligible_amount,
                r.payout_method, r.wallet_address, r.status, r.admin_note, r.transaction_hash, r.created_at
         FROM challenge_reward_requests r JOIN participants p ON p.id = r.participant_id
         ORDER BY r.created_at DESC LIMIT 100`,
      ),
      db.query(
        `SELECT id, email, challenge_passed_at FROM participants
         WHERE account_type = 'challenge' AND challenge_plan_key = 'challenge_5k'
           AND challenge_status = 'passed' ORDER BY challenge_passed_at DESC LIMIT 100`,
      ),
    ])
    return NextResponse.json({ success: true, claims: claims.rows, fundingReviews: fundingReviews.rows })
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load Challenge reviews." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const id = String(body?.id || "")
    const status = String(body?.status || "")
    const note = String(body?.note || "").trim().slice(0, 1000)
    const transactionHash = String(body?.transactionHash || "").trim()
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected", "paid"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid request or status." }, { status: 400 })
    }
    if (status === "rejected" && !note) return NextResponse.json({ success: false, message: "Provide a reason for rejection." }, { status: 400 })
    if (status === "paid" && !/^(0x)?[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return NextResponse.json({ success: false, message: "Provide a valid on-chain transaction hash before marking paid." }, { status: 400 })
    }
    const result = await withTransaction(async (client) => {
      const claimResult = await client.query(
        `SELECT r.id, r.status, r.participant_id, r.plan_key, r.passed_equity, r.eligible_amount,
                p.account_type, p.challenge_status, p.challenge_plan_key,
                p.challenge_passed_equity, p.account_frozen, p.is_frozen
         FROM challenge_reward_requests r JOIN participants p ON p.id = r.participant_id
         WHERE r.id = $1 FOR UPDATE OF r, p`,
        [id],
      )
      const claim = claimResult.rows[0]
      if (!claim) return { error: "Claim not found.", status: 404 }
      const plan = getChallengePlan(claim.plan_key)
      if (claim.account_type !== "challenge" || claim.challenge_status !== "passed" || claim.account_frozen || claim.is_frozen || claim.challenge_plan_key !== claim.plan_key ||
        claim.challenge_passed_equity == null || !plan || plan.key === "challenge_5k" ||
        Number(claim.passed_equity) !== Number(claim.challenge_passed_equity) ||
        Number(claim.eligible_amount) !== getChallengeRewardAmount(plan, Number(claim.challenge_passed_equity))) {
        return { error: "This evaluation is no longer eligible for a reward.", status: 409 }
      }
      if (status === "paid" ? claim.status !== "approved" : claim.status !== "pending") {
        return { error: "This review transition is not allowed.", status: 409 }
      }
      const updated = await client.query(
        `UPDATE challenge_reward_requests SET status = $1, admin_note = $2,
                transaction_hash = CASE WHEN $1 = 'paid' THEN $3 ELSE transaction_hash END,
                updated_at = NOW() WHERE id = $4 RETURNING id, status`,
        [status, note || null, status === "paid" ? transactionHash : null, id],
      )
      await client.query(
        `INSERT INTO activity_logs (actor_email, action, target_type, details)
         VALUES ($1, $2, 'challenge_reward', $3)`,
        [auth.email, `challenge_reward_${status}`, `Claim ${id}: ${note || status}`],
      )
      return { claim: updated.rows[0] }
    })
    if ("error" in result) return NextResponse.json({ success: false, message: result.error }, { status: result.status })
    return NextResponse.json({ success: true, claim: result.claim })
  } catch {
    return NextResponse.json({ success: false, message: "Unable to review reward." }, { status: 500 })
  }
}
