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
      subject: "Your Elite Fund password reset code",
      text: `Your Elite Fund password reset code is ${code}. It expires in 10 minutes. If you did not request a password reset, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Reset your password</h2><p>Use this one-time code to reset your Elite Fund password:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center">${code}</p><p>This code expires in 10 minutes and can only be used once.</p><p style="color:#64748b">If you did not request this, you can safely ignore this email.</p></div>`,
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
