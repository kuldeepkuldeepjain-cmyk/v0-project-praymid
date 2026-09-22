import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

function normalizeEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim().toLowerCase()
    : null
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { action, email, secret, verified } = await request.json()
    const normalizedEmail = normalizeEmail(email)
    const db = getPool()

    if (!normalizedEmail || !db) {
      return NextResponse.json({ success: false, error: !normalizedEmail ? "Valid admin email is required" : "Database unavailable" }, { status: 400 })
    }

    if (action === "store") {
      if (typeof secret !== "string" || secret.length < 16) {
        return NextResponse.json({ success: false, error: "A valid 2FA secret is required" }, { status: 400 })
      }
      await db.query(
        `INSERT INTO admin_2fa_secrets (admin_email, secret, verified, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (admin_email) DO UPDATE SET secret = EXCLUDED.secret, verified = EXCLUDED.verified, updated_at = NOW()`,
        [normalizedEmail, secret, Boolean(verified)],
      )
      return NextResponse.json({ success: true, message: "2FA secret stored" })
    }

    if (action === "get") {
      const result = await db.query(
        "SELECT secret, verified FROM admin_2fa_secrets WHERE admin_email = $1 LIMIT 1",
        [normalizedEmail],
      )
      const data = result.rows[0]
      return NextResponse.json({ success: true, secret: data?.secret || null, verified: Boolean(data?.verified) })
    }

    if (action === "verify") {
      const result = await db.query(
        "UPDATE admin_2fa_secrets SET verified = TRUE, updated_at = NOW() WHERE admin_email = $1 RETURNING admin_email",
        [normalizedEmail],
      )
      if (result.rowCount === 0) {
        return NextResponse.json({ success: false, error: "No 2FA secret found for this email" }, { status: 404 })
      }
      return NextResponse.json({ success: true, message: "2FA verified" })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[v0] 2FA storage error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
