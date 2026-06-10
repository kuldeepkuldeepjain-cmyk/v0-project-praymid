import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Starting schema fix migration...")

    // Drop old tables with wrong types
    await query(`DROP TABLE IF EXISTS staking_claims CASCADE`)
    await query(`DROP TABLE IF EXISTS staking_rewards CASCADE`)
    await query(`DROP TABLE IF EXISTS stakes CASCADE`)
    console.log("[v0] Dropped old staking tables")

    // Create stakes table with correct UUID type
    await query(`
      CREATE TABLE IF NOT EXISTS stakes (
        id SERIAL PRIMARY KEY,
        participant_id TEXT NOT NULL,
        participant_email VARCHAR(255) NOT NULL,
        coin_symbol VARCHAR(20) NOT NULL,
        amount DECIMAL(18, 8) NOT NULL,
        apy DECIMAL(5, 2) NOT NULL,
        daily_reward DECIMAL(18, 8) NOT NULL,
        start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        last_reward_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_earned DECIMAL(18, 8) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        is_restaked BOOLEAN NOT NULL DEFAULT false,
        restaked_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("[v0] Created stakes table with TEXT participant_id")

    // Create staking_rewards table
    await query(`
      CREATE TABLE IF NOT EXISTS staking_rewards (
        id SERIAL PRIMARY KEY,
        stake_id INTEGER NOT NULL,
        participant_id TEXT NOT NULL,
        participant_email VARCHAR(255) NOT NULL,
        reward_amount DECIMAL(18, 8) NOT NULL,
        accrued_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        claimed BOOLEAN NOT NULL DEFAULT false,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("[v0] Created staking_rewards table")

    // Create staking_claims table
    await query(`
      CREATE TABLE IF NOT EXISTS staking_claims (
        id SERIAL PRIMARY KEY,
        stake_id INTEGER NOT NULL,
        participant_id TEXT NOT NULL,
        participant_email VARCHAR(255) NOT NULL,
        amount_claimed DECIMAL(18, 8) NOT NULL,
        claim_type VARCHAR(50) NOT NULL DEFAULT 'claim',
        new_stake_id INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        claim_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("[v0] Created staking_claims table")

    // Recreate indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_participant_id ON stakes(participant_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_participant_email ON stakes(participant_email)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_coin_symbol ON stakes(coin_symbol)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_status ON stakes(status)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_stake_id ON staking_rewards(stake_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_participant_id ON staking_rewards(participant_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_claimed ON staking_rewards(claimed)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_claims_stake_id ON staking_claims(stake_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_claims_participant_id ON staking_claims(participant_id)`)
    console.log("[v0] Recreated indexes")

    return NextResponse.json({
      success: true,
      message: "Schema fix migration completed successfully!",
    })
  } catch (error: any) {
    console.error("[v0] Schema fix error:", error.message)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Schema fix failed",
        error: error.toString(),
      },
      { status: 500 }
    )
  }
}
