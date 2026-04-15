import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

const allUsers: Array<{
  email: string
  name: string
  role: "participant" | "admin" | "super_admin"
  password: string
  walletAddress?: string
  createdAt: string
}> = []

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { email, name, role } = body

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = allUsers.find((user) => user.email === email)
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const walletAddress =
      role === "participant" ? `0x${Math.random().toString(16).substring(2, 42).padEnd(40, "0")}` : undefined

    // Create new user with default password "12345"
    const newUser = {
      email,
      name,
      role,
      password: "12345",
      walletAddress,
      createdAt: new Date().toISOString(),
    }

    allUsers.push(newUser)

    console.log("[v0] Created new user:", { email, name, role, password: "12345", walletAddress })

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        email,
        name,
        role,
        password: "12345", // For demo purposes
        walletAddress,
        createdAt: newUser.createdAt,
      },
    })
  } catch (error) {
    console.error("[v0] Create user error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

// Get all users (for super admins only)
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      users: allUsers.map((user) => ({
        email: user.email,
        name: user.name,
        role: user.role,
        password: user.password,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      })),
    })
  } catch (error) {
    console.error("[v0] Get users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
