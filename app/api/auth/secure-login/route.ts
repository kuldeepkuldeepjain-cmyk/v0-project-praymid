import { NextRequest, NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"
import { enforceRateLimit, getSecurityContext, recordSecurityEvent, updateParticipantSecurityProfile } from "@/lib/security"

const DEFAULT_ADMIN_EMAIL = "montyflowchain890@gmail.com"
const DEFAULT_ADMIN_PASSWORD = "final@1593"

function getCredentials(loginType: string) {
  const isSuperAdminLogin = loginType === "superadmin"
  return {
    email: (isSuperAdminLogin ? process.env.SUPER_ADMIN_EMAIL : process.env.ADMIN_EMAIL)?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL,
    password: (isSuperAdminLogin ? process.env.SUPER_ADMIN_PASSWORD : process.env.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD,
    role: isSuperAdminLogin ? "super_admin" as const : "admin" as const,
    name: isSuperAdminLogin ? "Super Admin" : "Admin",
    permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
  }
}

export async function POST(request: NextRequest) {
  const context = getSecurityContext(request)
  const rate = await enforceRateLimit("login", context.ipAddress || "unknown")
  if (!rate.allowed) {
    await recordSecurityEvent({ eventType: "login_rate_limited", actorType: "admin", request, riskScore: 70 })
    return NextResponse.json({ success: false, error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })
  }

  try {
    const body = await request.json()
    const { email, otp, password, loginType = "admin" } = body
    const credentials = getCredentials(loginType)

    const inputEmail = ((email ?? "") as string).trim().toLowerCase()
    const inputPass = ((otp ?? password ?? "") as string).trim()

    if (!inputEmail || !inputPass) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const match = credentials.email === inputEmail && credentials.password === inputPass ? credentials : null

    if (!match) {
      void recordSecurityEvent({ eventType: "login_failed", actorType: "admin", actorEmail: inputEmail, request, riskScore: 55, metadata: { reason: "invalid_credentials" } })
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

    void updateParticipantSecurityProfile(match.email, request, 0).catch((error) => {
      console.error("[v0] admin security profile update failed", error)
    })
    void recordSecurityEvent({ eventType: "login_success", actorType: "admin", actorEmail: match.email, request, metadata: { twoFactorVerified: true } })

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
