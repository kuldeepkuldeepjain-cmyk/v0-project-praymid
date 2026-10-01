import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import speakeasy from "speakeasy"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { recordSecurityEvent } from "@/lib/security"

export const dynamic = "force-dynamic"

async function ensureAuthenticatorColumns() {
  await query(`
    CREATE TABLE IF NOT EXISTS participant_security_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_email TEXT UNIQUE NOT NULL,
      two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      totp_secret TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`ALTER TABLE participant_security_profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT`)
  await query(`ALTER TABLE participant_security_profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE`)
}

async function getProfile(email: string) {
  return query<{ two_factor_enabled: boolean; totp_secret: string | null }>(
    `SELECT two_factor_enabled, totp_secret FROM participant_security_profiles WHERE LOWER(participant_email) = LOWER($1) LIMIT 1`,
    [email],
  )
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureAuthenticatorColumns()
    const profile = await getProfile(auth.email)
    return NextResponse.json({
      success: true,
      enabled: profile[0]?.two_factor_enabled === true,
      configured: Boolean(profile[0]?.totp_secret),
    })
  } catch (error) {
    console.error("[v0] Failed to load authenticator status", error)
    return NextResponse.json({ success: false, error: "Unable to load authenticator status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    await ensureAuthenticatorColumns()
    const body = await request.json()
    const action = body?.action
    const code = String(body?.code || "").replace(/\s/g, "")
    const profile = await getProfile(auth.email)

    if (action === "setup") {
      if (profile[0]?.two_factor_enabled) {
        return NextResponse.json({ success: false, error: "Google Authenticator is already enabled" }, { status: 400 })
      }

      const secret = speakeasy.generateSecret({ name: `Praymid (${auth.email})`, issuer: "Praymid" })
      await query(
        `INSERT INTO participant_security_profiles (participant_email, two_factor_enabled, totp_secret, updated_at)
         VALUES ($1, FALSE, $2, NOW())
         ON CONFLICT (participant_email) DO UPDATE SET totp_secret = EXCLUDED.totp_secret, updated_at = NOW()`,
        [auth.email, secret.base32],
      )
      const qrCode = await QRCode.toDataURL(secret.otpauth_url || "")
      return NextResponse.json({ success: true, qrCode, manualKey: secret.base32, account: auth.email })
    }

    if (action === "enable") {
      const secret = profile[0]?.totp_secret
      if (!secret) return NextResponse.json({ success: false, error: "Start setup first" }, { status: 400 })
      if (!/^\d{6}$/.test(code) || !speakeasy.totp.verify({ secret, encoding: "base32", token: code, window: 1 })) {
        return NextResponse.json({ success: false, error: "Invalid verification code" }, { status: 400 })
      }
      await query(
        `UPDATE participant_security_profiles SET two_factor_enabled = TRUE, updated_at = NOW() WHERE LOWER(participant_email) = LOWER($1)`,
        [auth.email],
      )
      await recordSecurityEvent({ eventType: "two_factor_enabled", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
      return NextResponse.json({ success: true, enabled: true })
    }

    if (action === "disable") {
      const secret = profile[0]?.totp_secret
      if (!profile[0]?.two_factor_enabled) return NextResponse.json({ success: true, enabled: false })
      if (!secret || !/^\d{6}$/.test(code) || !speakeasy.totp.verify({ secret, encoding: "base32", token: code, window: 1 })) {
        return NextResponse.json({ success: false, error: "Enter a valid authenticator code to disable 2FA" }, { status: 400 })
      }
      await query(
        `UPDATE participant_security_profiles SET two_factor_enabled = FALSE, totp_secret = NULL, updated_at = NOW() WHERE LOWER(participant_email) = LOWER($1)`,
        [auth.email],
      )
      await recordSecurityEvent({ eventType: "two_factor_disabled", actorType: "participant", actorId: auth.participantId, actorEmail: auth.email, request })
      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({ success: false, error: "Unsupported authenticator action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Authenticator setup error", error)
    return NextResponse.json({ success: false, error: "Unable to update authenticator settings" }, { status: 500 })
  }
}
