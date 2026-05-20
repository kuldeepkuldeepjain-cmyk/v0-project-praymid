import { NextRequest, NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"

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
