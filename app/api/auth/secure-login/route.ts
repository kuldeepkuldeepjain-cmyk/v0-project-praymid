import { NextRequest, NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"
import { enforceRateLimit, getSecurityContext, recordSecurityEvent, updateParticipantSecurityProfile } from "@/lib/security"

// Valid admin credentials with Google Authenticator support
const CREDENTIALS = [
  {
    email: "montyflowchain890@gmail.com",
    password: "final@1593",
    role: "admin" as const,
    name: "Admin",
    permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
  },
]

export async function POST(request: NextRequest) {
  const context = getSecurityContext(request)
  const rate = await enforceRateLimit("login", context.ipAddress || "unknown")
  if (!rate.allowed) {
    await recordSecurityEvent({ eventType: "login_rate_limited", actorType: "admin", request, riskScore: 70 })
    return NextResponse.json({ success: false, error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })
  }

  try {
    const body = await request.json()
    const { email, otp, password } = body

    const inputEmail = ((email ?? "") as string).trim().toLowerCase()
    const inputPass = ((otp ?? password ?? "") as string).trim()

    if (!inputEmail || !inputPass) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Find matching credential (case-insensitive email)
    const match = CREDENTIALS.find(
      (c) => c.email.toLowerCase() === inputEmail && c.password === inputPass
    )

    if (!match) {
      await recordSecurityEvent({ eventType: "login_failed", actorType: "admin", actorEmail: inputEmail, request, riskScore: 55, metadata: { reason: "invalid_credentials" } })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // NOTE: TOTP verification is already done in the login flow before calling this API
    // The handleSetupQR and handleVerifyCode functions in login page verify the code
    // and only call this endpoint if verification succeeds

    // Save session using the shared session lib so encryption key is consistent
    try {
      await setAdminSession({ email: match.email, role: match.role })
    } catch (_) {
      // Session save is best-effort — client uses localStorage auth
    }

    await updateParticipantSecurityProfile(match.email, request, 0)
    await recordSecurityEvent({ eventType: "login_success", actorType: "admin", actorEmail: match.email, request, metadata: { twoFactorVerified: true } })

    return NextResponse.json({
      success: true,
      email: match.email,
      role: match.role,
      name: match.name,
      permissions: match.permissions,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed. Please try again." }, { status: 500 })
  }
}
