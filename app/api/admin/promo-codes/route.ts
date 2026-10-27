import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "")
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const rows = await query(
    `SELECT id, code, discount_percent, active, expires_at, max_uses, used_count, created_by, created_at
     FROM promo_codes ORDER BY created_at DESC`,
  )
  return NextResponse.json({ success: true, promoCodes: rows })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const code = normalizeCode(body.code)
    const discountPercent = Number(body.discountPercent)
    const maxUses = body.maxUses === "" || body.maxUses == null ? null : Number(body.maxUses)
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return NextResponse.json({ success: false, message: "Use 3–32 letters, numbers, hyphens, or underscores." }, { status: 400 })
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json({ success: false, message: "Discount must be between 0.01% and 100%." }, { status: 400 })
    }
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return NextResponse.json({ success: false, message: "Maximum uses must be a positive whole number." }, { status: 400 })
    }
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ success: false, message: "Enter a valid expiry date." }, { status: 400 })
    }

    await execute(
      `INSERT INTO promo_codes (code, discount_percent, active, expires_at, max_uses, created_by)
       VALUES ($1, $2, TRUE, $3, $4, $5)`,
      [code, discountPercent, expiresAt?.toISOString() || null, maxUses, auth.email],
    )
    return NextResponse.json({ success: true, message: `${code} created` })
  } catch (error: any) {
    if (error?.code === "23505") return NextResponse.json({ success: false, message: "That promo code already exists." }, { status: 409 })
    console.error("[promo-codes] POST error:", error)
    return NextResponse.json({ success: false, message: "Unable to create promo code" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { id, active } = await request.json()
    if (!id || typeof active !== "boolean") return NextResponse.json({ success: false, message: "Promo code and active state are required" }, { status: 400 })
    await execute("UPDATE promo_codes SET active = $1 WHERE id = $2", [active, id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[promo-codes] PATCH error:", error)
    return NextResponse.json({ success: false, message: "Unable to update promo code" }, { status: 500 })
  }
}
