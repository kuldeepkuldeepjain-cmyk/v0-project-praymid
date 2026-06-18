import { NextRequest, NextResponse } from "next/server"

// Valid admin credentials
const ADMIN_CREDENTIALS = [
  {
    email: "montyflowchain890@gmail.com",
    password: "final@1593",
    role: "admin",
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find matching admin credential (case-insensitive email)
    const admin = ADMIN_CREDENTIALS.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
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
