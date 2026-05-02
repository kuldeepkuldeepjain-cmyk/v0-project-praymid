import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email, couponType, amount, expiresAt } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })
    await sql`
      INSERT INTO spin_coupons (user_email, coupon_type, amount, expires_at, is_used)
      VALUES (${email}, ${couponType || "free_bet"}, ${amount || 5}, ${expiresAt}, false)
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
