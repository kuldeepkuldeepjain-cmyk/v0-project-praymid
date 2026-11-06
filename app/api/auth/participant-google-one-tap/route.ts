import { NextRequest, NextResponse } from "next/server"
import { randomBytes, randomUUID } from "node:crypto"
import { OAuth2Client } from "google-auth-library"
import { queryOne, execute } from "@/lib/db"
import { setParticipantSession } from "@/lib/session"
import { enforceRateLimit, getActiveRestriction, getSecurityContext } from "@/lib/security"
import { createGoogleParticipant, googleRegistrationSchema } from "@/lib/google-registration"

export const runtime = "nodejs"
const verifier = new OAuth2Client()
const nonceCookie = "google_login_nonce"
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth/participant-google-one-tap" }

function clientId() {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim()
}

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: NextRequest) {
  if (!clientId()) return failure("Google sign-in is not configured.", 503)
  const existing = request.cookies.get(nonceCookie)?.value
  const nonce = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex")
  const response = NextResponse.json({ clientId: clientId(), nonce }, { headers: { "Cache-Control": "no-store" } })
  response.cookies.set(nonceCookie, nonce, { ...cookieOptions, maxAge: 600 })
  return response
}

export async function POST(request: NextRequest) {
  try {
    if (!clientId()) return failure("Google sign-in is not configured.", 503)
    if (!request.headers.get("content-type")?.includes("application/json")) return failure("JSON request required.", 415)
    const body = await request.json().catch(() => null)
    const credential = body?.credential
    if (typeof credential !== "string" || !credential || credential.length > 16384) return failure("Google credential is required.", 400)
    const nonce = request.cookies.get(nonceCookie)?.value
    if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) return failure("Your sign-in request expired. Refresh the page and try again.", 403)

    const context = getSecurityContext(request)
    const rate = await enforceRateLimit("login", `google:${context.ipAddress || context.deviceHash}`)
    if (!rate.allowed) {
      const response = failure("Too many sign-in attempts. Please try again later.", 429)
      response.headers.set("Retry-After", String(rate.retryAfter || 60))
      return response
    }

    const ticket = await verifier.verifyIdToken({ idToken: credential, audience: clientId() }).catch(() => null)
    const googleUser = ticket?.getPayload()
    if (!googleUser || !googleUser.sub || !googleUser.email_verified || !googleUser.email || (googleUser as { nonce?: string }).nonce !== nonce) {
      return failure("Google sign-in could not be verified. Refresh the page and try again.", 401)
    }
    // Google is not authoritative for third-party email addresses without a Workspace domain.
    if (!googleUser.email.toLowerCase().endsWith("@gmail.com") && !googleUser.hd) {
      return failure("Use your password or PIN for this email address. Google login supports Gmail and Google Workspace accounts.", 403)
    }

    const email = googleUser.email.trim().toLowerCase()
    const intent = body?.intent
    if (await getActiveRestriction(email, "login")) return failure("Sign-in is unavailable while your account is under security review.", 403)
    let registered = false
    if (intent === "register-complete") {
      const existing = await queryOne<{ id: string }>("SELECT id FROM participants WHERE LOWER(TRIM(email)) = $1 LIMIT 1", [email])
      if (!existing) {
        const parsed = googleRegistrationSchema.safeParse(body.registration)
        if (!parsed.success) return failure(parsed.error.issues[0]?.message || "Complete your account details and accept the terms.", 400)
        const created = await createGoogleParticipant(email, parsed.data)
        if ("error" in created) return failure(created.error, 409)
        registered = true
      }
    }

    const participant = await queryOne<{
      id: string; email: string; username: string | null; full_name: string | null;
      wallet_address: string | null; bep20_address: string | null; account_balance: string | null;
      bonus_balance: string | null; activation_fee_paid: boolean; contribution_approved: boolean;
      created_at: string; is_frozen: boolean; account_frozen: boolean; is_deleted: boolean;
      status: string; is_active: boolean; otp_verified: boolean; details_completed: boolean; pin_configured: boolean;
      account_type: string | null; referral_code: string | null; referred_by: string | null;
      total_referrals: number | null; total_earnings: string | number | null; referral_earnings: string | number | null;
      rank: string | null; serial_number: number | null; funded_amount: string | number | null;
      funded_initial_balance: string | number | null; funded_breach_status: string | null;
    }>(`SELECT id, email, username, full_name, wallet_address, bep20_address, account_balance,
      bonus_balance, activation_fee_paid, contribution_approved, created_at, is_frozen, account_frozen,
      is_deleted, status, is_active, otp_verified, details_completed,
      account_type, referral_code, referred_by, total_referrals, total_earnings,
      referral_earnings, rank, serial_number, funded_amount, funded_initial_balance, funded_breach_status,
      (pin_hash IS NOT NULL AND pin_hash <> '') AS pin_configured
      FROM participants WHERE LOWER(TRIM(email)) = $1 LIMIT 1`, [googleUser.email.toLowerCase()])
    if (!participant) {
      if (intent === "register") {
        return NextResponse.json({ success: true, requiresRegistration: true, email,
          firstName: googleUser.given_name || "", lastName: googleUser.family_name || "" },
        { headers: { "Cache-Control": "no-store" } })
      }
      return failure("No account matches this Google email. Choose Create account to register with Google.", 404)
    }
    if (participant.is_deleted || participant.is_frozen || participant.account_frozen || participant.is_active === false || participant.otp_verified === false || participant.status !== "active") {
      return failure("Your account is not eligible to sign in. Complete verification or contact support.", 403)
    }
    if (await getActiveRestriction(participant.email, "login")) return failure("Sign-in is unavailable while your account is under security review.", 403)

    const sessionId = randomUUID()
    await execute("UPDATE participant_sessions SET is_active = false, last_activity = NOW() WHERE participant_id = $1", [participant.id])
    await execute(`INSERT INTO participant_sessions (id, participant_id, participant_email, token, device_fingerprint, ip_address, user_agent)
      VALUES ($1::uuid, $2::uuid, $3, $1::text, $4, $5::inet, $6)`,
    [sessionId, participant.id, participant.email, context.deviceHash, context.ipAddress, context.userAgent])
    await execute("UPDATE participants SET last_login = NOW(), last_seen = NOW(), updated_at = NOW() WHERE id = $1", [participant.id])
    await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant", sessionId, lastActivityAt: Date.now() })

    const response = NextResponse.json({
      success: true, registered, participantId: participant.id, email: participant.email,
      username: participant.username, name: participant.full_name || participant.username,
      walletAddress: participant.wallet_address || participant.bep20_address || "",
      bep20_address: participant.bep20_address, account_balance: Number(participant.account_balance) || 0,
      wallet_balance: Number(participant.account_balance) || 0, bonus_balance: Number(participant.bonus_balance) || 0,
      activation_fee_paid: participant.activation_fee_paid, contribution_approved: participant.contribution_approved,
      created_at: participant.created_at, is_frozen: participant.is_frozen,
      status: participant.status, is_active: participant.is_active,
      details_completed: participant.details_completed, pinConfigured: participant.pin_configured,
      account_type: participant.account_type || "normal", referral_code: participant.referral_code || "",
      referred_by: participant.referred_by || "", total_referrals: Number(participant.total_referrals) || 0,
      total_earnings: Number(participant.total_earnings) || 0, referral_earnings: Number(participant.referral_earnings) || 0,
      rank: participant.rank || "bronze", serial_number: participant.serial_number || "",
      funded_amount: Number(participant.funded_amount) || 0,
      funded_initial_balance: Number(participant.funded_initial_balance) || 0,
      funded_breach_status: participant.funded_breach_status || "clear",
      account_frozen: participant.account_frozen || false,
    }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(nonceCookie, "", { ...cookieOptions, maxAge: 0 })
    return response
  } catch {
    console.error("[google-login] Authentication could not be completed")
    return failure("Google sign-in is temporarily unavailable. Please try again or use your password.", 503)
  }
}
