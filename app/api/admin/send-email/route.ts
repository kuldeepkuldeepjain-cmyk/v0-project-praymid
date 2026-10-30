import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { Resend } from "resend"
import sanitizeHtml from "sanitize-html"
import { createBrandedEmailHtml, plainTextToEmailHtml } from "@/lib/admin-email-template"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM = "Elite Fund <verify@elitefund.sbs>"
const RESEND_BATCH_SIZE = 99
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
      const rows = await query<{ email: string }>("SELECT email FROM participants WHERE is_deleted IS NOT TRUE AND email IS NOT NULL ORDER BY email")
      recipients = rows.map(row => row.email.trim().toLowerCase())
    }

    recipients = [...new Set(recipients)]
    const invalidRecipients = recipients.filter(email => !EMAIL_PATTERN.test(email))
    const skippedRecipientCount = mode === "all" ? invalidRecipients.length : 0
    if (mode === "all") recipients = recipients.filter(email => EMAIL_PATTERN.test(email))
    if (!recipients.length || (mode !== "all" && invalidRecipients.length > 0)) {
      return NextResponse.json({ success: false, error: "No valid recipient email addresses were found." }, { status: 400 })
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
    const html = createBrandedEmailHtml(subject, emailContent)
    const campaignId = createHash("sha256")
      .update(JSON.stringify({ sender: auth.email, recipients, subject, message, html }))
      .digest("hex")
    const idempotencyKey = (batchIndex: number) => `admin-email/${campaignId}/${batchIndex}`

    if (recipients.length === 1) {
      const result = await resend.emails.send(
        { from: FROM, to: [recipients[0]], subject, text: message, html },
        { idempotencyKey: idempotencyKey(0) },
      )
      if (result.error) return NextResponse.json({ success: false, error: "Resend rejected the email request.", requestId: result.error.name }, { status: 502 })
      return NextResponse.json({ success: true, count: 1, skippedRecipientCount, requestId: result.data?.id || null })
    }

    let sentCount = 0
    let requestId: string | null = null
    const batchCount = Math.ceil(recipients.length / RESEND_BATCH_SIZE)

    for (let offset = 0; offset < recipients.length; offset += RESEND_BATCH_SIZE) {
      if (offset > 0) await new Promise<void>(resolve => setTimeout(resolve, 550))

      const batchIndex = offset / RESEND_BATCH_SIZE
      const batchRecipients = recipients.slice(offset, offset + RESEND_BATCH_SIZE)

      if (batchRecipients.length === 1) {
        const result = await resend.emails.send(
          { from: FROM, to: [batchRecipients[0]], subject, text: message, html },
          { idempotencyKey: idempotencyKey(batchIndex) },
        )
        if (result.error || !result.data) {
          return NextResponse.json({
            success: false,
            error: `Email batch ${batchIndex + 1} failed. ${sentCount} of ${recipients.length} emails were accepted by Resend before the failure.`,
            count: sentCount,
            totalCount: recipients.length,
            failedBatch: batchIndex + 1,
            requestId: result.error?.name || null,
          }, { status: 502 })
        }
        sentCount += 1
        requestId = result.data.id
        continue
      }

      const result = await resend.batch.send(
        batchRecipients.map(email => ({ from: FROM, to: [email], subject, text: message, html })),
        { idempotencyKey: idempotencyKey(batchIndex) },
      )

      if (result.error) {
        return NextResponse.json({
          success: false,
          error: `Email batch ${batchIndex + 1} failed. ${sentCount} of ${recipients.length} emails were accepted by Resend before the failure.`,
          count: sentCount,
          totalCount: recipients.length,
          failedBatch: batchIndex + 1,
          requestId: result.error.name,
        }, { status: 502 })
      }

      const batchIds = result.data?.data ?? []
      if (batchIds.length !== batchRecipients.length) {
        return NextResponse.json({
          success: false,
          error: `Email batch ${batchIndex + 1} returned an unexpected result. ${sentCount} of ${recipients.length} emails were confirmed by Resend.`,
          count: sentCount,
          totalCount: recipients.length,
          failedBatch: batchIndex + 1,
          requestId: batchIds[batchIds.length - 1]?.id || null,
        }, { status: 502 })
      }

      sentCount += batchIds.length
      requestId = batchIds[batchIds.length - 1]?.id || requestId
    }

    return NextResponse.json({ success: true, count: sentCount, skippedRecipientCount, batchCount, requestId })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to send email." }, { status: 500 })
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
