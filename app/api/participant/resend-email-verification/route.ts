import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateVerificationCode, isValidEmail, sendVerificationEmail } from "@/lib/resend-mail"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  try {
    const email = String((await request.json()).email || "").trim().toLowerCase()
    if (!emailPattern.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 })
    }

    const pending = await query<{ registration_data: any }>(`SELECT registration_data FROM registration_email_verifications WHERE LOWER(email) = $1 LIMIT 1`, [email])
    if (!pending.length) return NextResponse.json({ success: true, message: "If the registration is pending verification, a new code has been sent." })

    const code = generateVerificationCode()
    await query("UPDATE registration_email_verifications SET verification_code = $1, expires_at = NOW() + INTERVAL '15 minutes' WHERE LOWER(email) = $2", [code, email])
    const delivery = await sendVerificationEmail(email, code)
    if (!delivery.ok) return NextResponse.json({ success: false, message: delivery.message, requestId: delivery.requestId || null }, { status: delivery.status })
    return NextResponse.json({ success: true, message: "A new verification email has been sent.", requestId: delivery.requestId || null })
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
