import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { email, full_name, mobile_number, country, state, pin_code, full_address, wallet_address, bep20_address } = body

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!

    // Build dynamic update
    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (full_name !== undefined)     { fields.push(`full_name = $${idx++}`);     values.push(full_name) }
    if (mobile_number !== undefined) { fields.push(`mobile_number = $${idx++}`); values.push(mobile_number) }
    if (country !== undefined)       { fields.push(`country = $${idx++}`);       values.push(country) }
    if (state !== undefined)         { fields.push(`state = $${idx++}`);         values.push(state) }
    if (pin_code !== undefined)      { fields.push(`pin_code = $${idx++}`);      values.push(pin_code) }
    if (full_address !== undefined)  { fields.push(`full_address = $${idx++}`);  values.push(full_address) }

    // bep20_address is stored as wallet_address
    const walletVal = bep20_address || wallet_address
    if (walletVal !== undefined)     { fields.push(`wallet_address = $${idx++}`); values.push(walletVal) }

    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    values.push(email.toLowerCase().trim())
    const result = await db.query(
      `UPDATE participants SET ${fields.join(", ")}, details_completed = true WHERE email = $${idx} RETURNING *`,
      values
    )

    const p = result.rows[0]
    if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({ success: true, participant: { ...p, bep20_address: p.wallet_address } })
  } catch (error) {
    console.error("[participant/me PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const result = await db.query("SELECT * FROM participants WHERE email = $1", [email.toLowerCase().trim()])
    const participant = result.rows[0]

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        email: participant.email,
        username: participant.username,
        full_name: participant.full_name,
        serial_number: participant.serial_number,
        referral_code: participant.referral_code,
        referred_by: participant.referred_by,
        account_balance: Number(participant.account_balance) || 0,
        bonus_balance: Number(participant.bonus_balance) || 0,
        total_earnings: Number(participant.total_earnings) || 0,
        total_referrals: participant.total_referrals || 0,
        wallet_address: participant.wallet_address,
        bep20_address: participant.wallet_address,
        is_active: participant.is_active,
        status: participant.status,
        rank: participant.rank,
        activation_date: participant.activation_date,
        last_contribution_date: participant.last_contribution_date || null,
        next_contribution_date: participant.next_contribution_date || null,
        created_at: participant.created_at,
        country: participant.country,
        state: participant.state,
        pin_code: participant.pin_code,
        full_address: participant.full_address,
        mobile_number: participant.mobile_number,
        details_completed: participant.details_completed,
        referral_earnings: Number(participant.bonus_balance) || 0,
        wallet_balance: Number(participant.account_balance) || 0,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
