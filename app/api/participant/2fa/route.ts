import { NextRequest, NextResponse } from "next/server"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { recordSecurityEvent } from "@/lib/security"

export const dynamic = "force-dynamic"

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS participant_2fa_secrets (
      participant_id TEXT PRIMARY KEY,
      participant_email TEXT NOT NULL UNIQUE,
      secret TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureTable()
    const rows = await query<{ verified: boolean }>(
      "SELECT verified FROM participant_2fa_secrets WHERE participant_id = $1 LIMIT 1",
      [auth.participantId],
    )
    return NextResponse.json({ success: true, enabled: Boolean(rows[0]?.verified) })
  } catch (error) {
    console.error("[v0] Participant 2FA status error:", error)
    return NextResponse.json({ success: false, error: "Unable to load authenticator status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureTable()
    const body = await request.json()
    const action = body?.action

    if (action === "generate") {
      const existing = await query<{ verified: boolean }>(
        "SELECT verified FROM participant_2fa_secrets WHERE participant_id = $1 LIMIT 1",
        [auth.participantId],
      )
      if (existing[0]?.verified) {
        return NextResponse.json({ success: false, error: "Authenticator is already enabled" }, { status: 409 })
      }

      const generated = speakeasy.generateSecret({ length: 20, name: `FlowChain:${auth.email}`, issuer: "FlowChain" })
      await query(
        `INSERT INTO participant_2fa_secrets (participant_id, participant_email, secret, verified, updated_at)
         VALUES ($1, $2, $3, FALSE, NOW())
         ON CONFLICT (participant_id) DO UPDATE SET participant_email = EXCLUDED.participant_email, secret = EXCLUDED.secret, verified = FALSE, updated_at = NOW()`,
        [auth.participantId, auth.email.toLowerCase(), generated.base32],
      )
      const otpauthUrl = generated.otpauth_url || speakeasy.otpauthURL({ secret: generated.base32, label: `FlowChain:${auth.email}`, issuer: "FlowChain" })
      const qrCode = await QRCode.toDataURL(otpauthUrl, { width: 240, margin: 2 })
      return NextResponse.json({ success: true, secret: generated.base32, qrCode })
    }

    if (action === "verify") {
      const code = String(body?.code || "").replace(/\s/g, "")
      if (!/^\d{6}$/.test(code)) return NextResponse.json({ success: false, error: "Enter the 6-digit code" }, { status: 400 })
      const rows = await query<{ secret: string; verified: boolean }>(
        "SELECT secret, verified FROM participant_2fa_secrets WHERE participant_id = $1 LIMIT 1",
        [auth.participantId],
      )
      const record = rows[0]
      if (!record) return NextResponse.json({ success: false, error: "Generate a setup code first" }, { status: 400 })
      const valid = speakeasy.totp.verify({ secret: record.secret, encoding: "base32", token: code, window: 1 })
      if (!valid) return NextResponse.json({ success: false, error: "Invalid code. Check your authenticator and try again." }, { status: 400 })
      await query("UPDATE participant_2fa_secrets SET verified = TRUE, updated_at = NOW() WHERE participant_id = $1", [auth.participantId])
      await recordSecurityEvent({ eventType: "two_factor_enabled", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
      return NextResponse.json({ success: true, enabled: true })
    }

    if (action === "disable") {
      await query("DELETE FROM participant_2fa_secrets WHERE participant_id = $1", [auth.participantId])
      await recordSecurityEvent({ eventType: "two_factor_disabled", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({ success: false, error: "Unsupported authenticator action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Participant 2FA action error:", error)
    return NextResponse.json({ success: false, error: "Unable to update authenticator settings" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    await ensureTable()
    await query("DELETE FROM participant_2fa_secrets WHERE participant_id = $1", [auth.participantId])
    await recordSecurityEvent({ eventType: "two_factor_disabled", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
    return NextResponse.json({ success: true, enabled: false })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to disable authenticator" }, { status: 500 })
  }
}
