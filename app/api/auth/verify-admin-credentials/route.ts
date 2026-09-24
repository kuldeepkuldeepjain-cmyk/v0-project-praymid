import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ADMIN_EMAIL = "montyflowchain890@gmail.com"
const DEFAULT_ADMIN_PASSWORD = "final@1593"

function getAdminCredentials() {
  const configuredAdmin = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
    ? [{ email: process.env.ADMIN_EMAIL.trim().toLowerCase(), password: process.env.ADMIN_PASSWORD, role: "admin" }]
    : []
  const configuredSuperAdmin = process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD
    ? [{ email: process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase(), password: process.env.SUPER_ADMIN_PASSWORD, role: "super_admin" }]
    : []

  return [
    { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, role: "admin" },
    ...configuredAdmin,
    ...configuredSuperAdmin,
  ]
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const credentials = getAdminCredentials()
    const admin = credentials.find(
      (credential) => credential.email === email.trim().toLowerCase() && credential.password === password
    )

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      email: admin.email,
      role: admin.role,
    })
  } catch (error) {
    console.error("[v0] Admin credential verification error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
