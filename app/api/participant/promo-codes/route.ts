import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase().replace(/\s+/g, "")
  if (!code) return NextResponse.json({ success: false, message: "Enter a promo code." }, { status: 400 })

  try {
    const rows = await query(
      `SELECT code, discount_percent
       FROM promo_codes
       WHERE code = $1 AND active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)
       LIMIT 1`,
      [code],
    ) as Array<{ code: string; discount_percent: number }>

    if (!rows.length) return NextResponse.json({ success: false, message: "Promo code is invalid, expired, or no longer available." }, { status: 400 })

    const discountPercent = Number(rows[0].discount_percent)
    return NextResponse.json({ success: true, code: rows[0].code, discountPercent })
  } catch (error) {
    console.error("Promo validation error:", error)
    return NextResponse.json({ success: false, message: "Unable to validate this promo code." }, { status: 500 })
  }
}
