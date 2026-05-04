import { NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, otp, password, loginType } = body

    // Accept either `otp` or `password` field name
    const pass = otp ?? password ?? ""

    if (!email || !pass) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@123"
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "111111"
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "bitcoin890@gmail.com"
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "bitcoin890"

    if (loginType === "superadmin") {
      if (email.trim() !== SUPER_ADMIN_EMAIL || pass !== SUPER_ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
      }

      try { await setAdminSession({ email: email.trim(), role: "super_admin" }) } catch (_) {}

      return NextResponse.json({
        success: true,
        email: email.trim(),
        role: "super_admin",
        name: "Super Admin",
        permissions: { canApproveWallets: true, canCollectTokens: true, canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
      })
    }

    // Regular admin
    if (email.trim() !== ADMIN_EMAIL || pass !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    try { await setAdminSession({ email: email.trim(), role: "admin" }) } catch (_) {}

    return NextResponse.json({
      success: true,
      email: email.trim(),
      role: "admin",
      name: "Admin",
      permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
    })
  } catch (error) {
    console.log("[v0] secure-login error:", error)
    return NextResponse.json({ success: false, error: "Login failed. Please try again." }, { status: 500 })
  }
}
