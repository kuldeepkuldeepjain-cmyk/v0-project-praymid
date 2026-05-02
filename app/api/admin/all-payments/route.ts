import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const payments = await sql`
      SELECT * FROM payment_submissions
      ORDER BY created_at DESC
    `
    return NextResponse.json({ payments, success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
