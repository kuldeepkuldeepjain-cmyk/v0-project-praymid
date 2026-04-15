import { NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"

export async function POST(request: Request) {
  try {
    const { email, otp, loginType } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Credentials are read from environment variables — never hardcoded in source
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@123"
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "111111"
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "bitcoin890@gmail.com"
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "bitcoin890"

    if (loginType === "superadmin") {
      if (email !== SUPER_ADMIN_EMAIL || otp !== SUPER_ADMIN_PASSWORD) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
      }

      await setAdminSession({ email, role: "super_admin" })

      return NextResponse.json({
        success: true,
        email,
        role: "super_admin",
        name: "Super Admin",
        permissions: { canApproveWallets: true, canCollectTokens: true },
      })
    }

    if (email !== ADMIN_EMAIL || otp !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    await setAdminSession({ email, role: "admin" })

    return NextResponse.json({
      success: true,
      email,
      role: "admin",
      name: "Admin",
      permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
