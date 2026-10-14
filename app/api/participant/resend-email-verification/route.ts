import { NextResponse } from "next/server"
import { query } from "@/lib/db"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  try {
    const email = String((await request.json()).email || "").trim().toLowerCase()
    if (!emailPattern.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 })
    }

    const participants = await query<{ id: string; full_name: string | null }>(
      `SELECT id, full_name FROM participants
       WHERE LOWER(email) = $1 AND otp_verified = false AND status = 'pending' AND is_deleted = false
       LIMIT 1`,
      [email],
    )
    if (!participants.length) {
      return NextResponse.json({ success: true, message: "If the account is pending verification, a new code has been sent." })
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await query("UPDATE participants SET whatsapp_otp = $1, created_at = NOW(), updated_at = NOW() WHERE id = $2", [code, participants[0].id])

    const response = await fetch(`https://api.knock.app/v1/workflows/${encodeURIComponent(process.env.KNOCK_EMAIL_VERIFICATION_WORKFLOW || "email-verification")}/trigger`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.KNOCK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: [{ id: email, email }], data: { code, verificationCode: code, firstName: participants[0].full_name?.split(" ")[0] || "there" } }),
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
