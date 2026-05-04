import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || "flowchain-default-secret-change-in-production-32chars",
  cookieName: "admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
}

// Valid admin credentials
const CREDENTIALS = [
  {
    email: "admin@123",
    password: "111111",
    role: "admin" as const,
    name: "Admin",
    permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
  },
  {
    email: "bitcoin890@gmail.com",
    password: "bitcoin890",
    role: "super_admin" as const,
    name: "Super Admin",
    permissions: { canApproveWallets: true, canCollectTokens: true, canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
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

    const res = NextResponse.json({
      success: true,
      email: match.email,
      role: match.role,
      name: match.name,
      permissions: match.permissions,
    })

    try {
      const session = await getIronSession<{ email: string; role: string; isLoggedIn: boolean }>(
        request,
        res,
        SESSION_OPTIONS
      )
      session.email = match.email
      session.role = match.role
      session.isLoggedIn = true
      await session.save()
    } catch (_) {
      // Session save is best-effort — client uses localStorage auth
    }

    return res
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed. Please try again." }, { status: 500 })
  }
}
