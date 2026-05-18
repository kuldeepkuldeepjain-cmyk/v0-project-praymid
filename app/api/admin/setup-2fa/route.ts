import { NextRequest, NextResponse } from "next/server"
import { totp } from "speakeasy"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === "generate") {
      // Generate a new TOTP secret
      const secret = totp.generateSecret({
        name: "FlowChain Admin",
        issuer: "FlowChain",
        length: 32,
      })

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!)

      return NextResponse.json({
        success: true,
        secret: secret.base32,
        qrCode,
        otpauth_url: secret.otpauth_url,
      })
    }

    if (action === "verify") {
      const { secret, code } = await request.json()

      if (!secret || !code) {
        return NextResponse.json(
          { success: false, error: "Secret and code are required" },
          { status: 400 }
        )
      }

      const isValid = totp.verify({
        secret,
        encoding: "base32",
        token: code,
        window: 2, // Allow 30 seconds before and after
      })

      return NextResponse.json({
        success: isValid,
        message: isValid ? "Code verified successfully" : "Invalid code",
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] 2FA setup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
