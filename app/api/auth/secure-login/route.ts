import { NextRequest, NextResponse } from "next/server"
import { setAdminSession } from "@/lib/session"
import { totp } from "speakeasy"

// Valid admin credentials with Google Authenticator support
const CREDENTIALS = [
  {
    email: "montyflowchain890@gmail.com",
    password: "final@1593",
    totpSecret: "I4QXIVRSKYZXQ7JJMNCCQ6RDJZWXWYSUIE6D6MLTGVZUC5LGG43A", // Valid TOTP secret
    role: "admin" as const,
    name: "Admin",
    permissions: { canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
  },
  {
    email: "bitcoin890@gmail.com",
    password: "bitcoin890",
    totpSecret: "JFKDYIZOKRJFWV2IGBDCSI22EVWWOUR4FAZDMKTWJJCDGUKBKQ4Q", // Valid TOTP secret
    role: "super_admin" as const,
    name: "Super Admin",
    permissions: { canApproveWallets: true, canCollectTokens: true, canViewParticipants: true, canViewPayments: true, canManageAccounts: true },
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, password, totpCode } = body

    const inputEmail = ((email ?? "") as string).trim().toLowerCase()
    const inputPass = ((otp ?? password ?? "") as string).trim()
    const inputTotp = ((totpCode ?? "") as string).trim()

    if (!inputEmail || !inputPass) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Find matching credential (case-insensitive email)
    const match = CREDENTIALS.find(
      (c) => c.email.toLowerCase() === inputEmail && c.password === inputPass
    )

    if (!match) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Verify TOTP code if provided (Google Authenticator)
    if (inputTotp && match.totpSecret) {
      const isValidTotp = totp.verify({
        secret: match.totpSecret,
        encoding: "base32",
        token: inputTotp,
        window: 2, // Allow 2 time windows (±30 seconds)
      })

      if (!isValidTotp) {
        return NextResponse.json({ success: false, error: "Invalid authenticator code" }, { status: 401 })
      }
    }

    // Save session using the shared session lib so encryption key is consistent
    try {
      await setAdminSession({ email: match.email, role: match.role })
    } catch (_) {
      // Session save is best-effort — client uses localStorage auth
    }

    return NextResponse.json({
      success: true,
      email: match.email,
      role: match.role,
      name: match.name,
      permissions: match.permissions,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed. Please try again." }, { status: 500 })
  }
}
