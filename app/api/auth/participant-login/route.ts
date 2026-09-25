import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { setParticipantSession } from "@/lib/session"
import { query, execute } from "@/lib/db"
import { getFundedBaseAmount, getFundedEquity, getFundedMinimumBalance } from "@/lib/funded-account"
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

    // Query participant by email or mobile number
    let rows: any[] = []
    if (emailKey) {
      rows = await query(
        `SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                account_type, funded_amount, funded_initial_balance, funded_breach_status,
                country, state, pin_code, full_address, details_completed, bep20_address
         FROM participants WHERE email = $1 LIMIT 1`,
        [emailKey]
      )
    } else if (mobileKey) {
      rows = await query(
        `        SELECT id, email, password_hash, plain_password, username, full_name, wallet_address,
                account_balance, referral_code, referred_by, status, is_active,
                otp_verified, mobile_number, created_at, rank, serial_number,
                bonus_balance, total_earnings, total_referrals, referral_earnings,
                account_type, funded_amount, funded_initial_balance, funded_breach_status,
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
      // Properly hashed password — use bcrypt compare
      passwordValid = await bcrypt.compare(password, hash)
    } else {
      // Legacy plain-text stored password
      passwordValid = hash === password || (participant.plain_password && participant.plain_password === password)
    }

    if (!passwordValid) {
      await recordSecurityEvent({ eventType: "participant_login_failed", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 60, metadata: { reason: "invalid_password" } })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Opportunistically re-hash plain text passwords to bcrypt on successful login
    if (!isBcrypt) {
      // Password migration is maintenance work and must not delay the login redirect.
      void bcrypt.hash(password, 12)
        .then((newHash) => execute("UPDATE participants SET password_hash = $1, plain_password = $2 WHERE id = $3", [newHash, password, participant.id]))
        .catch(() => {})
    }

    const loginRestriction = await getActiveRestriction(participant.email, "login")
    if (loginRestriction) {
      await recordSecurityEvent({ eventType: "participant_login_blocked_restriction", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 100, metadata: { restrictionType: loginRestriction.restrictionType } })
      return NextResponse.json({ success: false, error: "Sign-in is temporarily unavailable while your account is under security review." }, { status: 403 })
    }

    // Block login if mobile OTP not yet verified by admin
    if (participant.otp_verified === false) {
      await updateParticipantSecurityProfile(participant.email, request, 20)
      await recordSecurityEvent({ eventType: "participant_login_pending_verification", actorType: "participant", actorEmail: participant.email, actorId: String(participant.id), request, riskScore: 20 })
      return NextResponse.json({
        success: false,
        error: "Your account is pending admin verification. Please wait for admin to verify your mobile OTP before logging in.",
        pendingVerification: true,
      }, { status: 403 })
    }

    const fundedInitialBalance = Number(participant.funded_initial_balance) || getFundedBaseAmount(participant.account_balance, participant.funded_amount)
    const fundedEquity = getFundedEquity(fundedInitialBalance, participant.account_balance)
    const shouldClearFundedBreach = participant.account_type === "funded"
      && participant.funded_breach_status === "breached"
      && fundedInitialBalance > 0
      && fundedEquity >= getFundedMinimumBalance(fundedInitialBalance)

    // Keep a server-side session registry so active sessions can be monitored and revoked.
    const sessionId = randomUUID()
    await execute("UPDATE participant_sessions SET is_active = false, last_activity = NOW() WHERE LOWER(participant_email) = LOWER($1)", [participant.email]).catch(() => {})
    await execute(
      `INSERT INTO participant_sessions (id, participant_id, participant_email, token, device_fingerprint, ip_address, user_agent)
       VALUES ($1, $2, $3, $1, $4, $5, $6)`,
      [sessionId, participant.id, participant.email, context.deviceHash, context.ipAddress, context.userAgent],
    ).catch(() => {})
    await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant", sessionId })

    // Audit, last-login, security profiling, and breach recovery are independent
    // maintenance tasks. They should not hold the login response open.
    void Promise.all([
      execute("UPDATE participants SET updated_at = NOW() WHERE id = $1", [participant.id]).catch(() => {}),
      updateParticipantSecurityProfile(participant.email, request, 0)
        .then((securityProfile) => recordSecurityEvent({
          eventType: "participant_login_success",
          actorType: "participant",
          actorEmail: participant.email,
          actorId: String(participant.id),
          request,
          riskScore: securityProfile.duplicateAccountCount > 0 ? 60 : 0,
          metadata: { duplicateAccountCount: securityProfile.duplicateAccountCount },
        }))
        .catch(() => {}),
      shouldClearFundedBreach
        ? execute(
          `UPDATE participants
           SET funded_breach_status = 'clear', funded_breach_at = NULL,
               funded_breach_balance = NULL, funded_breach_equity = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [participant.id],
        )
        : Promise.resolve(),
    ])
    if (shouldClearFundedBreach) participant.funded_breach_status = "clear"

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
      detail: process.env.NODE_ENV !== "production" ? error?.message : undefined,
      _debug: error?.message?.slice(0, 120),
    }, { status: 500 })
  }
}
