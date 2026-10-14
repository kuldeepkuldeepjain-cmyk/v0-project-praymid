import { NextResponse } from "next/server"
import { query } from "@/lib/db"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode, whatsappOtp, accountType } = await request.json()

    console.log("[v0] Registration attempt for email:", email)

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, message: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const emailKey = email.toLowerCase().trim()
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailKey)
    if (!emailIsValid) {
      return NextResponse.json({ success: false, message: "Please enter a valid email address" }, { status: 400 })
    }
    const usernameKey = username.toLowerCase().trim()
    const mobileNumberClean = mobileNumber?.toString().replace(/\D/g, "") || ""
    const selectedCountryCode = String(countryCode || "")
    const mobileIsValid = country === "India" || selectedCountryCode === "+91"
      ? /^[6-9]\d{9}$/.test(mobileNumberClean.replace(/^91/, ""))
      : /^\d{6,15}$/.test(mobileNumberClean.replace(/^\+/, "").replace(selectedCountryCode.replace(/^\+/, ""), ""))
    if (!mobileIsValid) {
      return NextResponse.json({ success: false, message: country === "India" || selectedCountryCode === "+91" ? "India requires a valid 10-digit mobile number" : "Please enter a valid mobile number for the selected country" }, { status: 400 })
    }
    const walletAddress = null
    const normalizedAccountType = accountType === "funded" ? "funded" : "normal"
    const newReferralCode = generateReferralCode(username)
    const emailVerificationCode = String(Math.floor(100000 + Math.random() * 900000))

    try {
      // Check duplicates
      const emailRows = await query("SELECT id FROM participants WHERE email = $1 LIMIT 1", [emailKey])
      if (emailRows.length > 0) {
        console.log("[v0] Email already registered:", email)
        return NextResponse.json({ success: false, message: "Email already registered" }, { status: 400 })
      }

      const usernameRows = await query("SELECT id FROM participants WHERE username = $1 LIMIT 1", [usernameKey])
      if (usernameRows.length > 0) {
        console.log("[v0] Username already taken:", username)
        return NextResponse.json({ success: false, message: "Username already taken" }, { status: 400 })
      }

      if (referralCode) {
        const refRows = await query("SELECT id FROM participants WHERE referral_code = $1 LIMIT 1", [referralCode.toUpperCase()])
        if (refRows.length === 0) {
          console.log("[v0] Invalid referral code:", referralCode)
          return NextResponse.json({ success: false, message: "Invalid referral code" }, { status: 400 })
        }
      }

      await query(`CREATE TABLE IF NOT EXISTS registration_email_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL,
        verification_code TEXT NOT NULL, registration_data JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
      )`)
      await query(
        `INSERT INTO registration_email_verifications (email, verification_code, registration_data, expires_at)
         VALUES ($1, $2, $3::jsonb, NOW() + INTERVAL '15 minutes')
         ON CONFLICT (email) DO UPDATE SET verification_code = EXCLUDED.verification_code, registration_data = EXCLUDED.registration_data, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
        [emailKey, emailVerificationCode, JSON.stringify({ fullName, username: usernameKey, email: emailKey, password: password.trim(), walletAddress, newReferralCode, referralCode: referralCode ? referralCode.toUpperCase() : null, normalizedAccountType, mobileNumber: `${selectedCountryCode}${mobileNumberClean}`, firstName: firstName.trim() })],
      )
      const knockApiKey = process.env.KNOCK_API_KEY
      const knockWorkflow = process.env.KNOCK_EMAIL_VERIFICATION_WORKFLOW || process.env.KNOCK_WORKFLOW_KEY || "email-verification"
      if (!knockApiKey) {
        await query("DELETE FROM registration_email_verifications WHERE email = $1", [emailKey])
        return NextResponse.json({ success: false, message: "Email verification is not configured yet. Please contact support." }, { status: 503 })
      }
      const knockHeaders = { Authorization: `Bearer ${knockApiKey}`, Accept: "application/json", "Content-Type": "application/json" }
      const identifyResponse = await fetch(`https://api.knock.app/v1/users/${encodeURIComponent(emailKey)}`, {
        method: "PUT",
        headers: knockHeaders,
        body: JSON.stringify({ id: emailKey, email: emailKey, name: fullName }),
      })
      if (!identifyResponse.ok) {
        const identifyError = await identifyResponse.text().catch(() => "")
        console.error("[v0] Knock recipient identify failed:", identifyResponse.status, identifyError.slice(0, 500))
        await query("DELETE FROM registration_email_verifications WHERE email = $1", [emailKey])
        return NextResponse.json({ success: false, message: "We couldn’t prepare the verification email. Please try again." }, { status: 502 })
      }
      const knockResponse = await fetch(`https://api.knock.app/v1/workflows/${encodeURIComponent(knockWorkflow)}/trigger`, {
        method: "POST",
        headers: knockHeaders,
        body: JSON.stringify({ recipients: [emailKey], data: { code: emailVerificationCode, firstName: firstName.trim(), verificationCode: emailVerificationCode } }),
      })
      if (!knockResponse.ok) {
        const knockError = await knockResponse.text().catch(() => "")
        console.error("[v0] Knock verification trigger failed:", knockResponse.status, knockError.slice(0, 500))
        await query("DELETE FROM registration_email_verifications WHERE email = $1", [emailKey])
        return NextResponse.json({ success: false, message: knockResponse.status === 404 ? "Email verification workflow was not found. Please contact support." : "We couldn’t send the verification email. Please try again." }, { status: 502 })
      }
      console.log("[v0] Verification email sent; account creation is pending verification for:", email)

      return NextResponse.json({
        success: true,
        verificationRequired: true,
        message: "Registration successful. Please verify your email before signing in.",
        participantId: null,
        walletAddress: walletAddress,
        username: usernameKey,
        email: emailKey,
        name: fullName,
        full_name: fullName,
        referralCode: newReferralCode,
        referral_code: newReferralCode,
        wallet_balance: 0,
        account_balance: 0,
        bonus_balance: 0,
        total_referrals: 0,
        total_earnings: 0,
        status: "pending",
        rank: "bronze",
        is_active: false,
        details_completed: false,
        created_at: new Date().toISOString(),
      }, { status: 200 })
    } catch (dbError: any) {
      console.error("[v0] Database error during registration:", dbError)
      const code = String(dbError?.code || "")
      const isTransient = ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "57P01", "08001", "08006"].includes(code)
      return NextResponse.json({
        success: false,
        message: isTransient
          ? "We’re having trouble connecting right now. Your account was not created. Please try again."
          : "We couldn’t complete registration right now. Please check your details and try again.",
      }, { status: isTransient ? 503 : 500 })
    }
  } catch (error: any) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({
      success: false,
      message: "We couldn’t complete registration right now. Please try again.",
    }, { status: 500 })
  }
}
