import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { ids, status } = await request.json()
    if (!ids?.length || !status) return NextResponse.json({ success: false, error: "ids and status required" }, { status: 400 })
    await sql`UPDATE payment_submissions SET status = ${status}, reviewed_at = NOW() WHERE id = ANY(${ids}::uuid[])`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
