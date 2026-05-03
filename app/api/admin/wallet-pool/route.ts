import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`SELECT id, wallet_address, assigned_to FROM wallet_pool`
    return NextResponse.json({ success: true, pool: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { email, wallet_address } = await req.json()
    const existing = await sql`SELECT id FROM wallet_pool WHERE assigned_to = ${email} LIMIT 1`
    if (existing.length > 0) {
      await sql`UPDATE wallet_pool SET wallet_address = ${wallet_address} WHERE assigned_to = ${email}`
    } else {
      await sql`INSERT INTO wallet_pool (wallet_address, network, status, assigned_to) VALUES (${wallet_address}, 'BSC', 'assigned', ${email})`
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
