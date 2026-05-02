import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, name, role } = await request.json()
    if (!email || !name || !role) return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 })

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return NextResponse.json({ error: "Invalid email format" }, { status: 400 })

    const existing = await sql`SELECT id FROM participants WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })

    const walletAddress = role === "participant" ? `0x${Math.random().toString(16).substring(2, 42).padEnd(40, "0")}` : undefined
    const serialRows = await sql`SELECT COALESCE(MAX(serial_number), 999) + 1 AS next FROM participants`
    const serialNumber = serialRows[0]?.next || 1000

    const rows = await sql`
      INSERT INTO participants (email, full_name, username, role, wallet_address, serial_number, status, password_hash)
      VALUES (${email}, ${name}, ${email.split("@")[0]}, ${role}, ${walletAddress || null}, ${serialNumber}, 'active', '12345')
      RETURNING id, email, full_name, role, wallet_address, serial_number, created_at
    `
    const newUser = rows[0]
    return NextResponse.json({ success: true, message: "User created successfully", user: { ...newUser, password: "12345" } })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const users = await sql`SELECT id, email, full_name, username, role, wallet_address, serial_number, created_at FROM participants ORDER BY created_at DESC`
    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
