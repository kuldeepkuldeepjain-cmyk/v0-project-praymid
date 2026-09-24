import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ADMIN_EMAIL = "montyflowchain890@gmail.com"
const DEFAULT_ADMIN_PASSWORD = "final@1593"

function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
    role: "admin",
  }
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
    const admin = credentials.email === email.trim().toLowerCase() && credentials.password === password
      ? credentials
      : null

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
