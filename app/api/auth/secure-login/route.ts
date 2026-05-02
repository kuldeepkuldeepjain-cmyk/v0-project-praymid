import { NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"

export async function POST(request: Request) {
  try {
    const { email, otp, loginType } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@123"
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "111111"
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "bitcoin890@gmail.com"
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "bitcoin890"

    // Hardcoded superuser — always works regardless of env vars
    const isSuperuser =
      (email === "kuldeepjainflow@gmail.com" && otp === "kuldeep@flow2026") ||
      (email === SUPER_ADMIN_EMAIL && otp === SUPER_ADMIN_PASSWORD)

    if (isSuperuser) {
      try { await setAdminSession({ email, role: "super_admin" }) } catch {}
      return NextResponse.json({
        success: true,
        token: `sa_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        email,
        role: "super_admin",
        name: "Superuser",
        permissions: {
          canApproveWallets: true,
          canCollectTokens: true,
          canViewParticipants: true,
          canViewPayments: true,
          canManageAccounts: true,
          fullAccess: true,
        },
      })
    }

    if (email !== ADMIN_EMAIL || otp !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    try { await setAdminSession({ email, role: "admin" }) } catch {}

    return NextResponse.json({
      success: true,
      token: `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      email,
      role: "admin",
      name: "Admin",
      permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
    })
  } catch (error: any) {
    console.error("[v0] secure-login error:", error?.message ?? error)
    return NextResponse.json({ success: false, error: "Login failed", detail: error?.message }, { status: 500 })
  }
}
