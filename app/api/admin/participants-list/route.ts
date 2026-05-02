import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const participants = await sql`
      SELECT
        id, serial_number, username, full_name, email,
        wallet_address, account_balance, is_active, created_at
      FROM participants
      ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, participants })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
