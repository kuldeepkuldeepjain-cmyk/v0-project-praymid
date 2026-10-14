import { NextResponse } from "next/server"
import { query } from "@/lib/db"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  try {
    const email = String((await request.json()).email || "").trim().toLowerCase()
    if (!emailPattern.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 })
    }

    const pending = await query<{ registration_data: any }>(`SELECT registration_data FROM registration_email_verifications WHERE LOWER(email) = $1 LIMIT 1`, [email])
    if (!pending.length) return NextResponse.json({ success: true, message: "If the registration is pending verification, a new code has been sent." })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await query("UPDATE registration_email_verifications SET verification_code = $1, expires_at = NOW() + INTERVAL '15 minutes' WHERE LOWER(email) = $2", [code, email])
    const registrationData = pending[0].registration_data

    const knockApiKey = process.env.KNOCK_API_KEY
    const knockWorkflow = process.env.KNOCK_EMAIL_VERIFICATION_WORKFLOW || process.env.KNOCK_WORKFLOW_KEY || "email-verification"
    if (!knockApiKey) return NextResponse.json({ success: false, message: "Email verification is not configured yet. Please contact support." }, { status: 503 })
    const response = await fetch(`https://api.knock.app/v1/workflows/${encodeURIComponent(knockWorkflow)}/trigger`, {
      method: "POST",
      headers: { Authorization: `Bearer ${knockApiKey}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: [{ id: email, email }], data: { code, verificationCode: code, firstName: registrationData.firstName || registrationData.fullName?.split(" ")[0] || "there" } }),
    })
    if (!response.ok) return NextResponse.json({ success: false, message: "Unable to send a new verification email right now." }, { status: 502 })
    return NextResponse.json({ success: true, message: "A new verification code has been sent." })
  } catch (error) {
    console.error("[v0] Resend email verification failed:", error)
    return NextResponse.json({ success: false, message: "Verification email is temporarily unavailable." }, { status: 500 })
  }
}

export const runtime = "nodejs"

// Verification codes are intentionally short-lived; this endpoint should not be cached.
export const dynamic = "force-dynamic"

// Prevent accidental method fallthrough in older Next runtimes.
export async function GET() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 })
}
