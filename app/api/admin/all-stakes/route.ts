import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const stakes = await query(
      `SELECT 
        s.id,
        s.participant_id,
        s.participant_email,
        s.coin_symbol,
        s.amount,
        s.apy,
        s.daily_reward,
        s.start_date,
        s.end_date,
        s.last_reward_date,
        s.total_earned,
        s.status,
        s.is_restaked,
        s.restaked_count,
        s.created_at,
        COALESCE(p.full_name, 'Unknown') as full_name,
        COALESCE(p.account_balance, 0)::text as account_balance
       FROM stakes s
       LEFT JOIN participants p ON s.participant_id::uuid = p.id
       ORDER BY s.created_at DESC
       LIMIT 1000`
    )

    const rewards = await query(
      `SELECT 
        sr.id,
        sr.stake_id,
        sr.participant_id,
        sr.participant_email,
        sr.reward_amount,
        sr.accrued_date,
        sr.claimed,
        sr.claimed_at,
        sr.created_at
       FROM staking_rewards sr
       ORDER BY sr.accrued_date DESC
       LIMIT 500`
    )

    const claims = await query(
      `SELECT 
        sc.id,
        sc.stake_id,
        sc.participant_id,
        sc.participant_email,
        sc.amount_claimed,
        sc.claim_type,
        sc.status,
        sc.claim_date,
        sc.created_at
       FROM staking_claims sc
       ORDER BY sc.claim_date DESC
       LIMIT 500`
    )

    const coins = await query(
      `SELECT * FROM staking_coins ORDER BY coin_symbol ASC`
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          stakes: stakes.map((s: any) => ({
            ...s,
            amount: parseFloat(s.amount),
            apy: parseFloat(s.apy),
            daily_reward: parseFloat(s.daily_reward),
            total_earned: parseFloat(s.total_earned),
            account_balance: parseFloat(s.account_balance || 0),
          })),
          rewards: rewards.map((r: any) => ({
            ...r,
            reward_amount: parseFloat(r.reward_amount),
          })),
          claims: claims.map((c: any) => ({
            ...c,
            amount_claimed: parseFloat(c.amount_claimed),
          })),
          coins: coins.map((c: any) => ({
            ...c,
            apy: parseFloat(c.apy),
            daily_rate: parseFloat(c.daily_rate),
          })),
          stats: {
            total_stakes: stakes.length,
            active_stakes: stakes.filter((s: any) => s.status === "active").length,
            claimed_stakes: stakes.filter((s: any) => s.status === "Claimed").length,
            total_staked: stakes.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0),
            total_earned: stakes.reduce((sum: number, s: any) => sum + parseFloat(s.total_earned), 0),
            total_rewards: rewards.reduce((sum: number, r: any) => sum + parseFloat(r.reward_amount), 0),
            total_claims: claims.reduce((sum: number, c: any) => sum + parseFloat(c.amount_claimed), 0),
          }
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] All stakes error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch stakes" },
      { status: 500 }
    )
  }
}
