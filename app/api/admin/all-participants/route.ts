import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { NextResponse } from "next/server"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const participants = await query(
      `SELECT email, username, account_balance, serial_number
       FROM participants
       ORDER BY serial_number DESC`
    )
    return NextResponse.json({ success: true, participants })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Request failed" }, { status: 500 })
  }
}
