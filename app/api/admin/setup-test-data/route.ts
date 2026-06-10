import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function GET() {
  try {
    // Check if test participant exists
    const existing = await query("SELECT id FROM participants WHERE email = $1", ["test@example.com"])

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Test participant already exists",
        email: "test@example.com",
        balance: 1000,
      })
    }

    // Create test participant
    const result = await execute(
      `INSERT INTO participants (
        full_name, username, email, password_hash, plain_password,
        account_balance, status, is_active, otp_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, account_balance`,
      [
        "Test User",
        "testuser",
        "test@example.com",
        "password123",
        "password123",
        1000,
        "active",
        true,
        true,
        "TEST1234",
      ]
    )

    return NextResponse.json({
      success: true,
      message: "Test participant created successfully",
      email: "test@example.com",
      balance: 1000,
    })
  } catch (error) {
    console.error("[v0] Setup test data error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to setup test data",
      },
      { status: 500 }
    )
  }
}
