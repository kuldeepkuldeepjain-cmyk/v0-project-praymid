import { NextRequest, NextResponse } from "next/server"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

let schemaReady: Promise<void> | null = null

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS participant_totp_secrets (
        participant_id TEXT PRIMARY KEY,
        participant_email TEXT NOT NULL UNIQUE,
        secret TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined).catch((error) => {
      schemaReady = null
      throw error
    })
  }
  await schemaReady
}

function normalizeCode(value: unknown) {
  return typeof value === "string" && /^\d{6}$/.test(value.trim()) ? value.trim() : null
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureSchema()
    const rows = await query<{ secret: string; verified: boolean }>(
      "SELECT secret, verified FROM participant_totp_secrets WHERE participant_id = $1 LIMIT 1",
      [auth.participantId],
    )
    const setup = rows[0]
    if (!setup) return NextResponse.json({ success: true, enabled: false })

    const otpauthUrl = speakeasy.otpauthURL({
      secret: setup.secret,
      encoding: "base32",
      label: `FlowChain:${auth.email}`,
      issuer: "FlowChain",
    })

    return NextResponse.json({
      success: true,
      enabled: Boolean(setup.verified),
      pending: !setup.verified,
      secret: setup.verified ? undefined : setup.secret,
      qrCode: setup.verified ? undefined : await QRCode.toDataURL(otpauthUrl),
    })
  } catch (error) {
    console.error("[v0] Participant TOTP GET error:", error)
    return NextResponse.json({ success: false, error: "Unable to load authenticator setup" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureSchema()
    const { code } = await request.json()
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) {
      return NextResponse.json({ success: false, error: "Enter the 6-digit code from Google Authenticator" }, { status: 400 })
    }

    const existing = await query<{ secret: string; verified: boolean }>(
      "SELECT secret, verified FROM participant_totp_secrets WHERE participant_id = $1 LIMIT 1",
      [auth.participantId],
    )
    let secret = existing[0]?.secret
    if (!secret) {
      secret = speakeasy.generateSecret({ length: 20 }).base32
      await query(
        `INSERT INTO participant_totp_secrets (participant_id, participant_email, secret, verified)
         VALUES ($1, $2, $3, FALSE)`,
        [auth.participantId, auth.email.toLowerCase(), secret],
      )
    }

    const valid = speakeasy.totp.verify({ secret, encoding: "base32", token: normalizedCode, window: 1 })
    if (!valid) return NextResponse.json({ success: false, error: "That code is invalid or expired" }, { status: 400 })

    await query(
      `UPDATE participant_totp_secrets SET verified = TRUE, updated_at = NOW()
       WHERE participant_id = $1`,
      [auth.participantId],
    )
    await query(
      `UPDATE participant_security_profiles SET two_factor_enabled = TRUE, updated_at = NOW()
       WHERE participant_email = $1`,
      [auth.email.toLowerCase()],
    ).catch(() => undefined)

    return NextResponse.json({ success: true, enabled: true })
  } catch (error) {
    console.error("[v0] Participant TOTP POST error:", error)
    return NextResponse.json({ success: false, error: "Unable to verify authenticator code" }, { status: 500 })
  }
}

export async function DELETE() {
  const auth = await requireParticipantSession()
  if (!auth.ok) return auth.response

  try {
    await ensureSchema()
    await query("DELETE FROM participant_totp_secrets WHERE participant_id = $1", [auth.participantId])
    await query(
      `UPDATE participant_security_profiles SET two_factor_enabled = FALSE, updated_at = NOW()
       WHERE participant_email = $1`,
      [auth.email.toLowerCase()],
    ).catch(() => undefined)
    return NextResponse.json({ success: true, enabled: false })
  } catch (error) {
    console.error("[v0] Participant TOTP DELETE error:", error)
    return NextResponse.json({ success: false, error: "Unable to disable authenticator" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
