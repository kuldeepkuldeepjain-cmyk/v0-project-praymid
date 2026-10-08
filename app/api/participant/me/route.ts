import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { email, full_name, wallet_address, bep20_address } = body

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!

    // Only update columns that exist in the DB: full_name, wallet_address
    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name) }

    // bep20_address is stored as wallet_address in the DB
    const walletVal = bep20_address ?? wallet_address
    if (walletVal !== undefined) { fields.push(`wallet_address = $${idx++}`); values.push(walletVal) }

    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    values.push(email.toLowerCase().trim())
    const result = await db.query(
      `UPDATE participants SET ${fields.join(", ")}, updated_at = NOW() WHERE email = $${idx} RETURNING *`,
      values
    )

    const p = result.rows[0]
    if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      participant: {
        ...p,
        bep20_address: p.wallet_address || null,
        next_contribution_date: p.next_contribution_date || null,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const normalizedEmail = email.toLowerCase().trim()
    let result
    let topUpCount = 0
    let fundedTierTopUpCount = 0

    try {
      result = await db.query(
        `SELECT
          p.*,
          COALESCE(topups.count, 0)::int AS top_up_count,
          COALESCE(topups.funded_tier_count, 0)::int AS funded_tier_top_up_count
         FROM participants p
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*) AS count,
             COUNT(*) FILTER (WHERE payment_method = 'funded_tier') AS funded_tier_count
           FROM topup_requests
           WHERE participant_id = p.id
         ) topups ON TRUE
         WHERE p.email = $1`,
        [normalizedEmail]
      )
      topUpCount = Number(result.rows[0]?.top_up_count) || 0
      fundedTierTopUpCount = Number(result.rows[0]?.funded_tier_top_up_count) || 0
    } catch (error: any) {
      // Keep profile reads available on deployments without the optional top-up schema.
      if (error?.code !== "42P01" && error?.code !== "42703") throw error
      result = await db.query(
        "SELECT * FROM participants WHERE email = $1",
        [normalizedEmail]
      )
    }

    const p = result.rows[0]
    if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      participant: {
        ...p,
        bep20_address: p.wallet_address || null,
        next_contribution_date: p.next_contribution_date || null,
        last_contribution_date: p.last_contribution_date || null,
        // Coerce PostgreSQL numeric strings to JS numbers
        account_balance: Number(p.account_balance) || 0,
        wallet_balance: Number(p.wallet_balance ?? p.account_balance) || 0,
        bonus_balance: Number(p.bonus_balance) || 0,
        total_earnings: Number(p.total_earnings) || 0,
        contributed_amount: Number(p.contributed_amount) || 0,
        participation_count: Number(p.participation_count) || 0,
        top_up_count: topUpCount,
        funded_tier_top_up_count: fundedTierTopUpCount,
        has_funded_tier_top_up: fundedTierTopUpCount > 0,
        has_prior_top_up: topUpCount > 0,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
