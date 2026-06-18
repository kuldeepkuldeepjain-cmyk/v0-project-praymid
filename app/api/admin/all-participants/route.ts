import { query, execute, queryOne } from "@/lib/db"
import { NextResponse } from "next/server"


export async function GET() {
  try {
    const participants = await sql`
      SELECT email, username, account_balance, serial_number
      FROM participants
      ORDER BY serial_number DESC
    `
    return NextResponse.json({ success: true, participants })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
