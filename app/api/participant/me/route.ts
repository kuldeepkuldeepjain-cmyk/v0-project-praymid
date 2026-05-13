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
    const result = await db.query(
      "SELECT * FROM participants WHERE email = $1",
      [email.toLowerCase().trim()]
    )

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
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
