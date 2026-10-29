import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import sanitizeHtml from "sanitize-html"
import { createBrandedEmailHtml, plainTextToEmailHtml } from "@/lib/admin-email-template"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM = "Elite Fund <verify@elitefund.sbs>"
const EMAIL_CSS_LENGTH = /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))){0,3}$/i
const EMAIL_CSS_COLOR = /^(?:#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent|[a-z]{1,20})$/i
const EMAIL_HTML_OPTIONS = {
  allowedTags: ["a", "blockquote", "br", "div", "em", "h1", "h2", "h3", "hr", "img", "li", "ol", "p", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul", "u"],
  allowedAttributes: {
    "*": ["style"],
    a: ["href"],
    img: ["src", "alt", "width", "height"],
    table: ["role", "width", "cellpadding", "cellspacing", "border"],
    td: ["align", "valign", "colspan", "rowspan", "width"],
    th: ["align", "valign", "colspan", "rowspan", "width"],
  },
  allowedStyles: {
    "*": {
      color: [EMAIL_CSS_COLOR],
      "background-color": [EMAIL_CSS_COLOR],
      "font-family": [/^[\w\s,"'-]+$/i],
      "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      "font-weight": [/^(?:normal|bold|[1-9]00)$/i],
      "line-height": [/^(?:normal|\d+(?:\.\d+)?(?:px|pt|em|rem|%)?)$/i],
      "text-align": [/^(?:left|right|center|justify)$/i],
      "text-decoration": [/^(?:none|underline|line-through)$/i],
      display: [/^(?:block|inline|inline-block|table|table-cell)$/i],
      width: [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      "max-width": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      margin: [EMAIL_CSS_LENGTH],
      padding: [EMAIL_CSS_LENGTH],
      "border-radius": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      "letter-spacing": [/^-?\d+(?:\.\d+)?(?:px|pt|em|rem)$/i],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const mode = body.mode === "single" ? "single" : body.mode === "multiple" ? "multiple" : "all"
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const htmlBody = typeof body.htmlBody === "string" ? body.htmlBody.trim() : ""
    if (!subject || subject.length > 180 || !message || message.length > 10000 || htmlBody.length > 30000) {
      return NextResponse.json({ success: false, error: "Subject and plain-text fallback are required. Subject must be 180 characters or fewer, the fallback 10,000 or fewer, and HTML 30,000 or fewer." }, { status: 400 })
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
    const sanitizedHtmlBody = htmlBody ? sanitizeHtml(htmlBody, EMAIL_HTML_OPTIONS).trim() : ""
    if (htmlBody && !sanitizedHtmlBody) {
      return NextResponse.json({ success: false, error: "The HTML body has no supported content. Add text or supported HTML tags and try again." }, { status: 400 })
    }
    const emailContent = sanitizedHtmlBody || plainTextToEmailHtml(message)
    const result = await resend.emails.send({ from: FROM, to: recipients, subject, text: message, html: createBrandedEmailHtml(subject, emailContent) }, { idempotencyKey: `admin-email/${auth.email}/${Date.now()}` })
    if (result.error) return NextResponse.json({ success: false, error: "Resend rejected the email request.", requestId: result.error.name }, { status: 502 })

    return NextResponse.json({ success: true, count: recipients.length, requestId: result.data?.id || null })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to send email." }, { status: 500 })
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
