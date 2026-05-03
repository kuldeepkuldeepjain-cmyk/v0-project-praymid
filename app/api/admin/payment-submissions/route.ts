import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

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
      rows = await sql`SELECT * FROM payment_submissions WHERE status = ${status} AND created_at >= ${startDate.toISOString()} ORDER BY created_at DESC LIMIT 100`
    } else if (status !== "all") {
      rows = await sql`SELECT * FROM payment_submissions WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`
    } else if (startDate) {
      rows = await sql`SELECT * FROM payment_submissions WHERE created_at >= ${startDate.toISOString()} ORDER BY created_at DESC LIMIT 100`
    } else {
      rows = await sql`SELECT * FROM payment_submissions ORDER BY created_at DESC LIMIT 100`
    }

    return NextResponse.json({ success: true, submissions: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
