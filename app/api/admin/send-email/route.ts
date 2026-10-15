import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM = "Elite Fund <verify@elitefund.sbs>"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const mode = body.mode === "single" ? "single" : body.mode === "multiple" ? "multiple" : "all"
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    if (!subject || subject.length > 180 || !message || message.length > 10000) {
      return NextResponse.json({ success: false, error: "Subject and message are required. Subject must be 180 characters or fewer and message 10,000 or fewer." }, { status: 400 })
    }

    let recipients: string[] = []
    if (mode === "single") {
      recipients = [typeof body.email === "string" ? body.email.trim().toLowerCase() : ""]
    } else if (mode === "multiple") {
      recipients = Array.isArray(body.emails) ? body.emails.filter((email: unknown): email is string => typeof email === "string").map((email: string) => email.trim().toLowerCase()) : []
    } else {
      const rows = await query<{ email: string }>("SELECT email FROM participants WHERE is_deleted IS NOT TRUE AND email IS NOT NULL ORDER BY email LIMIT 100")
      recipients = rows.map(row => row.email.trim().toLowerCase())
    }

    recipients = [...new Set(recipients)]
    if (!recipients.length || recipients.length > 100 || recipients.some(email => !EMAIL_PATTERN.test(email))) {
      return NextResponse.json({ success: false, error: "Provide between 1 and 100 valid recipient email addresses." }, { status: 400 })
    }
    if (mode === "multiple" && recipients.length !== (body.emails as unknown[] | undefined)?.length) {
      return NextResponse.json({ success: false, error: "All recipient email addresses must be valid and unique." }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: "Email service is not configured." }, { status: 503 })
    const resend = new Resend(apiKey)
    const escapedMessage = message.replace(/[&<>\"]/g, (character: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character as "&" | "<" | ">" | "\""] || character).replace(/\n/g, "<br />")
    const result = await resend.emails.send({ from: FROM, to: recipients, subject, text: message, html: `<p>${escapedMessage}</p>` }, { idempotencyKey: `admin-email/${auth.email}/${Date.now()}` })
    if (result.error) return NextResponse.json({ success: false, error: "Resend rejected the email request.", requestId: result.error.name }, { status: 502 })

    return NextResponse.json({ success: true, count: recipients.length, requestId: result.data?.id || null })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to send email." }, { status: 500 })
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
