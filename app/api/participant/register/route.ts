import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode, whatsappOtp } = await request.json()

    console.log("[v0] Registration attempt for email:", email)

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, message: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const emailKey = email.toLowerCase().trim()
    const usernameKey = username.toLowerCase().trim()
    const mobileNumberClean = mobileNumber?.toString().trim() || null
    const walletAddress = null
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

      // Insert new participant with $50 unclaimed welcome bonus
      const inserted = await query<Record<string, any>>(
        `INSERT INTO participants
          (full_name, username, email, password_hash, plain_password, wallet_address,
           referral_code, referred_by, account_balance, status, is_active,
           whatsapp_otp, otp_verified, mobile_number, unclaimed_bonus, bonus_claimed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'active',true,$9,true,$10,50,false)
         RETURNING id, full_name, username, email, referral_code, account_balance, unclaimed_bonus, bonus_claimed, status, is_active, created_at`,
        [
          fullName, usernameKey, emailKey, password.trim(), password.trim(), walletAddress,
          newReferralCode, referralCode ? referralCode.toUpperCase() : null,
          whatsappOtp || null, mobileNumberClean,
        ]
      )

      if (!inserted || inserted.length === 0) {
        console.log("[v0] Failed to insert participant")
        return NextResponse.json({ success: false, message: "Failed to create account. Please try again." }, { status: 500 })
      }

      const newParticipant = inserted[0]
      console.log("[v0] Registration successful for:", email, "ID:", newParticipant.id)

      // Increment referrer's referral count if a valid referral code was used
      if (referralCode) {
        try {
          await query(
            `UPDATE participants SET referral_count = COALESCE(referral_count, 0) + 1, total_referrals = COALESCE(total_referrals, 0) + 1 WHERE referral_code = $1`,
            [referralCode.toUpperCase()]
          )
        } catch (e) {
          console.log("[v0] Failed to increment referrer count:", e)
        }
      }

      return NextResponse.json({
        success: true,
        message: "Registration successful! Your account is now active. You can log in immediately. Welcome bonus: $50 (claim by making your first contribution).",
        participantId: newParticipant.id,
        walletAddress: walletAddress,
        username: usernameKey,
        email: emailKey,
        name: fullName,
        full_name: fullName,
        referralCode: newReferralCode,
        referral_code: newReferralCode,
        wallet_balance: 0,
        account_balance: 0,
        unclaimed_bonus: 50,
        bonus_claimed: false,
        bonus_balance: 0,
        total_referrals: 0,
        total_earnings: 0,
        status: "active",
        rank: "bronze",
        is_active: true,
        details_completed: false,
        created_at: newParticipant.created_at,
      }, { status: 200 })
    } catch (dbError: any) {
      console.error("[v0] Database error during registration:", dbError)
      return NextResponse.json({ 
        success: false, 
        message: dbError.message || "Database error during registration" 
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Registration failed. Please try again." 
    }, { status: 500 })
  }
}
