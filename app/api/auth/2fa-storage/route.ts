import { NextRequest, NextResponse } from "next/server"

// Store 2FA secrets in-memory (in production, use a database)
// Format: { email: { secret: string, verified: boolean } }
const twoFactorSecrets: Record<string, { secret: string; verified: boolean }> = {}

export async function POST(request: NextRequest) {
  try {
    const { action, email, secret, verified } = await request.json()

    if (action === "store") {
      // Store the 2FA secret for this admin
      twoFactorSecrets[email.toLowerCase()] = {
        secret,
        verified: verified || false,
      }

      return NextResponse.json({
        success: true,
        message: "2FA secret stored",
      })
    }

    if (action === "get") {
      // Get the 2FA secret for this admin
      const data = twoFactorSecrets[email.toLowerCase()]

      return NextResponse.json({
        success: true,
        secret: data?.secret || null,
        verified: data?.verified || false,
      })
    }

    if (action === "verify") {
      // Mark the 2FA secret as verified
      const data = twoFactorSecrets[email.toLowerCase()]

      if (!data) {
        return NextResponse.json(
          { success: false, error: "No 2FA secret found for this email" },
          { status: 404 }
        )
      }

      data.verified = true

      return NextResponse.json({
        success: true,
        message: "2FA verified",
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[v0] 2FA storage error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
