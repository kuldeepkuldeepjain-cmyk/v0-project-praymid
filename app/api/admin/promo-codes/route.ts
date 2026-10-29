import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const discountTypes = new Set(["percent", "fiat", "inr"])

function normalizeCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "")
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, code, discount_type, discount_value, active, expires_at, max_uses, used_count, created_by, created_at
       FROM promo_codes ORDER BY created_at DESC`,
    )
    return NextResponse.json({ success: true, promoCodes: rows })
  } catch (error) {
    console.error("[promo-codes] GET error:", error)
    return NextResponse.json({ success: false, message: "Unable to load promo codes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const code = normalizeCode(body.code)
    const discountType = String(body.discountType ?? "")
    const discountValue = Number(body.discountValue)
    const maxUses = body.maxUses === "" || body.maxUses == null ? null : Number(body.maxUses)
    const expiryInput = typeof body.expiresAt === "string" ? body.expiresAt.trim() : ""
    const expiresAt = expiryInput
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? `${expiryInput}T23:59:59.999Z` : expiryInput)
      : null

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return NextResponse.json({ success: false, message: "Use 3–32 letters, numbers, hyphens, or underscores." }, { status: 400 })
    }
    if (!discountTypes.has(discountType)) {
      return NextResponse.json({ success: false, message: "Choose percentage, USD fiat, or INR as the discount type." }, { status: 400 })
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percent" && discountValue > 100)) {
      return NextResponse.json({ success: false, message: discountType === "percent" ? "Percentage must be between 0.01% and 100%." : "Discount value must be greater than zero." }, { status: 400 })
    }
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return NextResponse.json({ success: false, message: "Maximum uses must be a positive whole number." }, { status: 400 })
    }
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ success: false, message: "Enter a valid expiry date." }, { status: 400 })
    }

    await execute(
      `INSERT INTO promo_codes (code, discount_type, discount_value, discount_percent, active, expires_at, max_uses, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7)`,
      [code, discountType, discountValue, discountType === "percent" ? discountValue : 0, expiresAt?.toISOString() || null, maxUses, auth.email],
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
    const updated = await execute("UPDATE promo_codes SET active = $1 WHERE id = $2", [active, id])
    if (!updated) return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[promo-codes] PATCH error:", error)
    return NextResponse.json({ success: false, message: "Unable to update promo code" }, { status: 500 })
  }
}
