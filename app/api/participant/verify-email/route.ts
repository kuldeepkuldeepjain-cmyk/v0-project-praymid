import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    const emailKey = String(email || "").trim().toLowerCase()
    const codeKey = String(code || "").trim()
    if (!emailKey || !/^\d{6}$/.test(codeKey)) {
      return NextResponse.json({ success: false, message: "Enter the 6-digit verification code." }, { status: 400 })
    }

    const rows = await query<{ id: string }>(
      `SELECT id FROM participants
       WHERE LOWER(email) = $1
         AND whatsapp_otp = $2
         AND otp_verified = false
         AND status = 'pending'
         AND created_at > NOW() - INTERVAL '15 minutes'
       LIMIT 1`,
      [emailKey, codeKey],
    )
    if (!rows.length) return NextResponse.json({ success: false, message: "Invalid or expired verification code. Request a new code and try again." }, { status: 400 })

    await query("UPDATE participants SET otp_verified = true, otp_verified_at = NOW(), whatsapp_otp = NULL, status = 'active', is_active = true, updated_at = NOW() WHERE id = $1", [rows[0].id])
    return NextResponse.json({ success: true, participantId: rows[0].id, message: "Email verified. Your account is ready to use." })
  } catch (error) {
    console.error("[v0] Email verification failed:", error)
    return NextResponse.json({ success: false, message: "Verification is temporarily unavailable. Please try again." }, { status: 500 })
  }
}
