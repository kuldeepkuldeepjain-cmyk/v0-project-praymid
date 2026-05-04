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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, password, loginType } = body

    // Accept either `otp` or `password` field name
    const pass = (otp ?? password ?? "").toString()
    const cleanEmail = (email ?? "").toString().trim()

    if (!cleanEmail || !pass) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@123"
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "111111"
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "bitcoin890@gmail.com"
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "bitcoin890"

    let role: "admin" | "super_admin"
    let permissions: Record<string, boolean>

    if (loginType === "superadmin") {
      if (cleanEmail !== SUPER_ADMIN_EMAIL || pass !== SUPER_ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
      }
      role = "super_admin"
      permissions = { canApproveWallets: true, canCollectTokens: true, canViewParticipants: true, canViewPayments: true, canManageAccounts: true }
    } else {
      if (cleanEmail !== ADMIN_EMAIL || pass !== ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
      }
      role = "admin"
      permissions = { canViewParticipants: true, canViewPayments: true, canManageAccounts: true }
    }

    // Set iron-session cookie on the response object (correct way in Route Handlers)
    const res = NextResponse.json({
      success: true,
      email: cleanEmail,
      role,
      name: role === "super_admin" ? "Super Admin" : "Admin",
      permissions,
    })

    try {
      const session = await getIronSession<{ email: string; role: string; isLoggedIn: boolean }>(
        request,
        res,
        SESSION_OPTIONS
      )
      session.email = cleanEmail
      session.role = role
      session.isLoggedIn = true
      await session.save()
    } catch (_) {
      // Session save failed — still return success since client uses localStorage auth
    }

    return res
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed. Please try again." }, { status: 500 })
  }
}
