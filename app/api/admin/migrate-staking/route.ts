import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Starting staking tables migration...")

    // Create staking_coins table
    await query(`
      CREATE TABLE IF NOT EXISTS staking_coins (
        id SERIAL PRIMARY KEY,
        coin_symbol VARCHAR(20) NOT NULL UNIQUE,
        coin_name VARCHAR(100) NOT NULL,
        apy DECIMAL(5, 2) NOT NULL DEFAULT 12.5,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'Low',
        enabled BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        min_stake DECIMAL(18, 8) NOT NULL DEFAULT 10,
        max_stake DECIMAL(18, 8) NOT NULL DEFAULT 1000000,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("[v0] Created staking_coins table")

    // Create stakes table - use TEXT for participant_id to match UUID type in participants table
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
    console.log("[v0] Created stakes table")

    // Create staking_rewards table - use TEXT for IDs to match UUID
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

    // Create staking_claims table - use TEXT for IDs
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

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_participant_id ON stakes(participant_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_participant_email ON stakes(participant_email)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_coin_symbol ON stakes(coin_symbol)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_stakes_status ON stakes(status)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_stake_id ON staking_rewards(stake_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_participant_id ON staking_rewards(participant_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_rewards_claimed ON staking_rewards(claimed)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_claims_stake_id ON staking_claims(stake_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_staking_claims_participant_id ON staking_claims(participant_id)`)
    console.log("[v0] Created indexes")

    // Insert default staking coins
    const coins = [
      ["BTC", "Bitcoin", 8.5, "Low", "Store of value, low volatility"],
      ["ETH", "Ethereum", 12.0, "Medium", "Ethereum blockchain token"],
      ["BNB", "Binance Coin", 15.0, "Medium", "Binance Smart Chain token"],
      ["SOL", "Solana", 18.0, "Medium", "High-speed blockchain"],
      ["XRP", "Ripple", 10.0, "Medium", "Cross-border payments"],
      ["DOGE", "Dogecoin", 6.0, "High", "Community-driven cryptocurrency"],
      ["ADA", "Cardano", 14.0, "Medium", "Proof of stake blockchain"],
      ["AVAX", "Avalanche", 16.0, "Medium", "Layer 1 blockchain"],
      ["LINK", "Chainlink", 11.0, "Medium", "Oracle solution"],
      ["DOT", "Polkadot", 13.0, "Medium", "Multi-chain platform"],
      ["TRX", "Tron", 9.0, "Medium", "Content distribution"],
      ["LTC", "Litecoin", 7.5, "Low", "Silver to Bitcoin"],
      ["ATOM", "Cosmos", 12.5, "Medium", "Interoperability hub"],
      ["MATIC", "Polygon", 14.5, "Medium", "Ethereum scaling solution"],
      ["ARB", "Arbitrum", 17.0, "Medium", "Layer 2 solution"],
      ["APT", "Aptos", 19.0, "High", "Move-based blockchain"],
      ["SUI", "Sui", 20.0, "High", "Object-oriented blockchain"],
      ["TON", "Ton", 11.0, "Medium", "Telegram blockchain"],
      ["NEAR", "Near Protocol", 15.5, "Medium", "Scalable blockchain"],
      ["FLOW", "Flow", 13.0, "Medium", "NFT-focused blockchain"],
    ]

    let inserted = 0
    for (const [symbol, name, apy, risk, desc] of coins) {
      const result = await query(
        `INSERT INTO staking_coins (coin_symbol, coin_name, apy, risk_level, description) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (coin_symbol) DO NOTHING
         RETURNING id`,
        [symbol, name, apy, risk, desc]
      )
      if (result.length > 0) inserted++
    }
    console.log(`[v0] Inserted ${inserted} staking coins`)

    return NextResponse.json({
      success: true,
      message: "Staking tables migration completed successfully!",
    })
  } catch (error: any) {
    console.error("[v0] Migration error:", error.message)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Migration failed",
        error: error.toString(),
      },
      { status: 500 }
    )
  }
}
