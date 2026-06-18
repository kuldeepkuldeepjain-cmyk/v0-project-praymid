import { NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const dateRange = searchParams.get("dateRange") || "all"

    let startDate: Date | null = null
    const now = new Date()
    if (dateRange === "7d") { startDate = new Date(); startDate.setDate(now.getDate() - 7) }
    else if (dateRange === "30d") { startDate = new Date(); startDate.setDate(now.getDate() - 30) }
    else if (dateRange === "90d") { startDate = new Date(); startDate.setDate(now.getDate() - 90) }

    let rows
    if (status !== "all" && startDate) {
      rows = await query(
        `SELECT * FROM payment_submissions WHERE status = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 100`,
        [status, startDate.toISOString()]
      )
    } else if (status !== "all") {
      rows = await query(
        `SELECT * FROM payment_submissions WHERE status = $1 ORDER BY created_at DESC LIMIT 100`,
        [status]
      )
    } else if (startDate) {
      rows = await query(
        `SELECT * FROM payment_submissions WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 100`,
        [startDate.toISOString()]
      )
    } else {
      rows = await query(`SELECT * FROM payment_submissions ORDER BY created_at DESC LIMIT 100`)
    }

    return NextResponse.json({ success: true, submissions: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
