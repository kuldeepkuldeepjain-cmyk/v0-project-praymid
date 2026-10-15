import { Resend } from "resend"

const FROM = "Elite Fund <verify@elitefund.sbs>"

export async function sendVerificationEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false as const, status: 503, message: "Email service is not configured." }

  const resend = new Resend(apiKey)
  const result = await resend.emails.send(
    {
      from: FROM,
      to: [to],
      subject: "Verify your Elite Fund account",
      text: `Your Elite Fund verification code is ${code}. It expires in 15 minutes. If you did not create this account, ignore this email.`,
      html: `<p>Your Elite Fund verification code is <strong>${code}</strong>.</p><p>This code expires in 15 minutes.</p><p>If you did not create this account, you can ignore this email.</p>`,
    },
    { idempotencyKey: `registration-verification/${to}/${code}` },
  )

  if (result.error) return { ok: false as const, status: 502, message: "The verification email could not be sent.", requestId: result.error.name }
  return { ok: true as const, requestId: result.data?.id }
}

export async function sendDiagnosticEmail(to: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false as const, status: 503, message: "Email service is not configured." }
  const resend = new Resend(apiKey)
  const result = await resend.emails.send(
    { from: FROM, to: [to], subject: "Elite Fund email service test", text: "This confirms the Elite Fund email service is working." },
    { idempotencyKey: `diagnostic-email/${to}/${new Date().toISOString().slice(0, 13)}` },
  )
  if (result.error) return { ok: false as const, status: 502, message: result.error.message, requestId: result.error.name }
  return { ok: true as const, requestId: result.data?.id }
} 

export { FROM }

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}
