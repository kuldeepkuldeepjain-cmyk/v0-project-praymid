import { NextRequest, NextResponse } from "next/server"
import speakeasy from "speakeasy"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  try {
    // Read body once
    const body = await request.json()
    const { action } = body

    if (action === "generate") {
      // Generate a new TOTP secret
      const secret = speakeasy.generateSecret({
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
      const { secret, code } = body

      if (!secret || !code) {
        return NextResponse.json(
          { success: false, error: "Secret and code are required" },
          { status: 400 }
        )
      }

      // Debug logs
      console.log("[v0] Verifying 2FA code")
      console.log("[v0] Secret length:", secret.length)
      console.log("[v0] Code:", code)
      console.log("[v0] Code length:", code.length)

      try {
        const isValid = speakeasy.totp.verify({
          secret: secret,
          encoding: "base32",
          token: code,
          window: 2,
        })

        console.log("[v0] Verification result:", isValid)

        return NextResponse.json({
          success: isValid,
          message: isValid ? "Code verified successfully" : "Invalid code",
        })
      } catch (verifyError) {
        console.error("[v0] Verification error:", verifyError)
        return NextResponse.json(
          { success: false, error: "Verification error: " + (verifyError as Error).message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] 2FA setup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
