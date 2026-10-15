import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateVerificationCode, isValidEmail, sendVerificationEmail } from "@/lib/resend-mail"

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
    const emailIsValid = isValidEmail(emailKey)
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

      const verificationCode = generateVerificationCode()
      const registrationData = { fullName, firstName: firstName.trim(), username: usernameKey, email: emailKey, password: password.trim(), walletAddress, newReferralCode, referralCode: referralCode ? referralCode.toUpperCase() : null, normalizedAccountType, mobileNumber: `${selectedCountryCode}${mobileNumberClean}` }
      await query(`DELETE FROM registration_email_verifications WHERE LOWER(email) = $1`, [emailKey])
      await query(`INSERT INTO registration_email_verifications (email, verification_code, registration_data, expires_at) VALUES ($1, $2, $3::jsonb, NOW() + INTERVAL '15 minutes')`, [emailKey, verificationCode, JSON.stringify(registrationData)])
      const delivery = await sendVerificationEmail(emailKey, verificationCode)
      if (!delivery.ok) {
        await query(`DELETE FROM registration_email_verifications WHERE LOWER(email) = $1`, [emailKey])
        return NextResponse.json({ success: false, message: delivery.message, requestId: delivery.requestId || null }, { status: delivery.status })
      }
      return NextResponse.json({ success: true, requiresEmailVerification: true, message: "Check your email for a verification code.", email: emailKey, requestId: delivery.requestId || null }, { status: 200 })
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
