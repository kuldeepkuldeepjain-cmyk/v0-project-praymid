import { NextRequest, NextResponse } from "next/server"
import { startParticipantLogin } from "@/lib/session"
import { query, execute } from "@/lib/db"
import { enforceRateLimit, getActiveRestriction, getSecurityContext, recordSecurityEvent, updateParticipantSecurityProfile } from "@/lib/security"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password, mobile_number } = await request.json()
    const context = getSecurityContext(request)
    const identityKey = String(email || mobile_number || context.ipAddress || "unknown").toLowerCase()
    const rate = await enforceRateLimit("login", identityKey)
    if (!rate.allowed) {
      await recordSecurityEvent({ eventType: "participant_login_rate_limited", actorType: "participant", request, riskScore: 70 })
      return NextResponse.json({ success: false, error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })
    }

    if (!password) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 })
    }

    if (!email && !mobile_number) {
      return NextResponse.json({ success: false, error: "Email or mobile number is required" }, { status: 400 })
    }

    let emailKey = email ? email.toLowerCase().trim() : null
    let mobileKey = mobile_number ? mobile_number.toString().trim() : null

    // Keep the PIN column available for existing participant databases before reading it.
    await execute("ALTER TABLE participants ADD COLUMN IF NOT EXISTS pin_hash TEXT").catch(() => {})

    // Query participant by email or mobile number
    let rows: any[] = []
    if (emailKey) {
      rows = await query(
        `SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                account_type, funded_amount, funded_initial_balance, funded_breach_status,
                is_deleted, is_frozen, account_frozen, pin_hash,
                country, state, pin_code, full_address, details_completed, bep20_address
         FROM participants WHERE LOWER(TRIM(email)) = $1 LIMIT 1`,
        [emailKey]
      )
    } else if (mobileKey) {
      rows = await query(
        `        SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                account_type, funded_amount, funded_initial_balance, funded_breach_status,
                is_deleted, is_frozen, account_frozen, pin_hash,
                country, state, pin_code, full_address, details_completed, bep20_address
         FROM participants
         WHERE mobile_number = $1
            OR regexp_replace(COALESCE(mobile_number, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         LIMIT 1`,
        [mobileKey]
      )
    }

    if (rows.length === 0) {
      await recordSecurityEvent({ eventType: "participant_login_failed", actorType: "participant", actorEmail: emailKey, request, riskScore: 55, metadata: { reason: "unknown_account" } })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const participant = rows[0] as any

    // Verify password — support bcrypt hashes AND plain text (legacy accounts)
    let passwordValid = false
    const hash = participant.password_hash || ""
    const isBcrypt = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")

    if (isBcrypt) {
      // Prefer the hash, but support accounts whose stored hash was rotated while
      // their legacy password field still contains the password they use.
      passwordValid = await bcrypt.compare(password, hash)
      if (!passwordValid && participant.plain_password) {
        passwordValid = participant.plain_password === password
      }
    } else {
      // Legacy plain-text stored password
      passwordValid = hash === password || (participant.plain_password && participant.plain_password === password)
    }

    if (!passwordValid) {
      await recordSecurityEvent({ eventType: "participant_login_failed", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 60, metadata: { reason: "invalid_password" } })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Opportunistically re-hash plain text passwords to bcrypt on successful login
    if (!isBcrypt || participant.plain_password === password) {
      // Keep the canonical hash aligned with the password that successfully authenticated.
      await bcrypt.hash(password, 12)
        .then((newHash) => execute("UPDATE participants SET password_hash = $1, plain_password = $2 WHERE id = $3", [newHash, password, participant.id]))
        .catch(() => {})
    }

    const loginRestriction = await getActiveRestriction(participant.email, "login")
    if (loginRestriction) {
      await recordSecurityEvent({ eventType: "participant_login_blocked_restriction", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 100, metadata: { restrictionType: loginRestriction.restrictionType } })
      return NextResponse.json({ success: false, error: "Sign-in is temporarily unavailable while your account is under security review." }, { status: 403 })
    }

    const fundedAccountBreached = participant.funded_breach_status === "breached"
    if (participant.is_deleted || participant.is_frozen || (participant.account_frozen && !fundedAccountBreached) || ["blocked", "frozen", "suspended"].includes(participant.status)) {
      return NextResponse.json({ success: false, error: "Account is unavailable" }, { status: 403 })
    }

    if (participant.otp_verified === false || participant.status === "pending" || participant.is_active === false) {
      await updateParticipantSecurityProfile(participant.email, request, 20)
      await recordSecurityEvent({ eventType: "participant_login_pending_email_verification", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 20 })
      return NextResponse.json({
        success: false,
        error: "Please verify your email before signing in. Check your inbox for the verification code.",
        pendingVerification: true,
        emailVerificationRequired: true,
      }, { status: 403 })
    }


    await startParticipantLogin(participant, context)
    void updateParticipantSecurityProfile(participant.email, request, 0)
      .then((securityProfile) => recordSecurityEvent({
        eventType: "participant_login_success",
        actorType: "participant",
        actorEmail: participant.email,
        actorId: String(participant.id),
        request,
        riskScore: securityProfile.duplicateAccountCount > 0 ? 60 : 0,
        metadata: { duplicateAccountCount: securityProfile.duplicateAccountCount },
      }))
      .catch((error) => console.error("[login] security profile update failed:", error?.message))

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      email: participant.email,
      username: participant.username || participant.email.split("@")[0],
      name: participant.full_name || participant.username || "",
      full_name: participant.full_name || "",
      walletAddress: participant.wallet_address || participant.bep20_address || "",
      bep20_address: participant.bep20_address || participant.wallet_address || "",
      wallet_balance: Number(participant.account_balance) || 0,
      account_balance: Number(participant.account_balance) || 0,
      bonus_balance: Number(participant.bonus_balance) || 0,
      total_referrals: Number(participant.total_referrals) || 0,
      total_earnings: Number(participant.total_earnings) || 0,
      referral_earnings: Number(participant.referral_earnings) || 0,
      referral_code: participant.referral_code || "",
      referred_by: participant.referred_by || "",
      serial_number: participant.serial_number || "",
      status: participant.status || "pending",
      account_type: participant.account_type || "standard",
      funded_amount: Number(participant.funded_amount) || 0,
      funded_initial_balance: Number(participant.funded_initial_balance) || 0,
      funded_breach_status: participant.funded_breach_status || "clear",
      rank: participant.rank || "bronze",
      is_active: participant.is_active !== false,
      otp_verified: participant.otp_verified || false,
      details_completed: participant.details_completed || false,
      pinConfigured: Boolean(participant.pin_hash),
      country: participant.country || "",
      state: participant.state || "",
      pin_code: participant.pin_code || "",
      full_address: participant.full_address || "",
      mobile_number: participant.mobile_number || "",
      activation_date: null,
      created_at: participant.created_at,
    })
  } catch (error: any) {
    console.error("[login] Unexpected error:", error?.message, error?.code, error?.detail)
    return NextResponse.json({
      success: false,
      error: "Login failed",
    }, { status: 500 })
  }
}
