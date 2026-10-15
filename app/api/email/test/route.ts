import { NextResponse } from "next/server"
import { sendDiagnosticEmail, isValidEmail, getClientIp } from "@/lib/resend-mail"

export const runtime = "nodejs"

const attempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = attempts.get(ip)
  if (entry && entry.resetAt > now && entry.count >= 3) return NextResponse.json({ success: false, message: "Too many diagnostic requests. Try again later." }, { status: 429 })
  if (!entry || entry.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 })
  else entry.count += 1

  try {
    const body = await request.json()
    const to = String(body?.to || "").trim().toLowerCase()
    if (!isValidEmail(to) || to.length > 254) return NextResponse.json({ success: false, message: "A valid test recipient is required." }, { status: 400 })
    const result = await sendDiagnosticEmail(to)
    if (!result.ok) return NextResponse.json({ success: false, message: result.message, requestId: result.requestId || null }, { status: result.status })
    return NextResponse.json({ success: true, message: "Resend accepted the email request.", requestId: result.requestId || null })
  } catch {
    return NextResponse.json({ success: false, message: "Unable to send the diagnostic email." }, { status: 400 })
  }
}
