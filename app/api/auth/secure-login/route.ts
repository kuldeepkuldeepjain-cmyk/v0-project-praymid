import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email: string = (body.email ?? "").toString().trim().toLowerCase()
    const otp: string = (body.otp ?? "").toString().trim()

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@123").trim().toLowerCase()
    const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD ?? "111111").trim()
    const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "bitcoin890@gmail.com").trim().toLowerCase()
    const SUPER_ADMIN_PASSWORD = (process.env.SUPER_ADMIN_PASSWORD ?? "bitcoin890").trim()

    // Hardcoded superuser — always works regardless of env vars
    const isSuperuser =
      (email === "kuldeepjainflow@gmail.com" && otp === "kuldeep@flow2026") ||
      (email === SUPER_ADMIN_EMAIL && otp === SUPER_ADMIN_PASSWORD)

    if (isSuperuser) {
      const token = `sa_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const res = NextResponse.json({
        success: true,
        token,
        email,
        role: "super_admin",
        name: "Superuser",
        permissions: {
          fullAccess: true,
          canApproveWallets: true,
          canCollectTokens: true,
          canViewParticipants: true,
          canViewPayments: true,
          canManageAccounts: true,
          canViewAllActivity: true,
          canFreezeAccounts: true,
          canManageAdmins: true,
          canAccessDatabase: true,
        },
      })
      res.cookies.set("admin_session", JSON.stringify({ email, role: "super_admin", token }), {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      })
      return res
    }

    // Regular admin
    if (email !== ADMIN_EMAIL || otp !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    const token = `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const res = NextResponse.json({
      success: true,
      token,
      email,
      role: "admin",
      name: "Admin",
      permissions: {
        canViewParticipants: true,
        canViewPayments: true,
        canManageAccounts: true,
        canViewAllActivity: true,
        canFreezeAccounts: true,
        canManageAdmins: false,
        canAccessDatabase: false,
      },
    })
    res.cookies.set("admin_session", JSON.stringify({ email, role: "admin", token }), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    })
    return res
  } catch (error: any) {
    console.error("secure-login error:", error?.message ?? error)
    return NextResponse.json(
      { success: false, error: "Login failed", detail: String(error?.message ?? "") },
      { status: 500 }
    )
  }
}
