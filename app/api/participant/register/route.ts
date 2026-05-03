import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { sql } from "@/lib/db"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode } = await request.json()

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, error: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`

    // Check for existing email
    const existingEmail = await sql`SELECT email FROM participants WHERE email = ${email} LIMIT 1`
    if (existingEmail.length > 0) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
    }

    // Check for existing phone
    const existingPhone = await sql`SELECT mobile_number FROM participants WHERE mobile_number = ${mobileNumber} LIMIT 1`
    if (existingPhone.length > 0) {
      return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })
    }

    // Check for existing username
    const existingUsername = await sql`SELECT username FROM participants WHERE username = ${username.toLowerCase()} LIMIT 1`
    if (existingUsername.length > 0) {
      return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }

    // Validate referral code if provided
    let referrerData: any = null
    if (referralCode) {
      const referrerRows = await sql`
        SELECT referral_code, email, username, total_referrals, account_balance
        FROM participants
        WHERE referral_code = ${referralCode.toUpperCase()}
        LIMIT 1
      `
      if (referrerRows.length === 0) {
        return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
      }
      referrerData = referrerRows[0]
    }

    const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
    const newReferralCode = generateReferralCode(username)
    const hashedPassword = await bcrypt.hash(password, 10)

    const newParticipantRows = await sql`
      INSERT INTO participants (
        full_name, username, email, mobile_number, password, plain_password,
        wallet_address, country, country_code, state, pin_code,
        status, rank, referral_code, referred_by,
        total_referrals, total_earnings, account_balance, bonus_balance, is_active
      ) VALUES (
        ${fullName}, ${username.toLowerCase()}, ${email}, ${mobileNumber},
        ${hashedPassword}, ${password}, ${walletAddress},
        ${country || ""}, ${countryCode || ""}, ${state || ""}, ${pinCode || ""},
        ${"active"}, ${"bronze"}, ${newReferralCode},
        ${referralCode ? referralCode.toUpperCase() : null},
        ${0}, ${0}, ${0}, ${0}, ${true}
      )
      RETURNING *
    `
    const newParticipant = newParticipantRows[0]

    if (!newParticipant) {
      return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 })
    }

    if (referrerData) {
      const newReferralCount = (referrerData.total_referrals || 0) + 1
      await sql`UPDATE participants SET total_referrals = ${newReferralCount} WHERE referral_code = ${referralCode.toUpperCase()}`

      const referrerRows = await sql`SELECT id FROM participants WHERE referral_code = ${referralCode.toUpperCase()} LIMIT 1`
      const referrerParticipant = referrerRows[0]

      if (referrerParticipant && mobileNumber) {
        const phoneDigits = mobileNumber.replace(/\D/g, "")
        const encoder = new TextEncoder()
        const data = encoder.encode(phoneDigits)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const phoneHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

        await sql`
          UPDATE invite_logs
          SET participant_email = ${newParticipant.email}
          WHERE participant_id = ${referrerParticipant.id}
            AND contact_hash = ${phoneHash}
        `
      }
    }

    await setParticipantSession({
      participantId: newParticipant.id,
      email: newParticipant.email,
      role: "participant",
    })

    return NextResponse.json({
      success: true,
      message: "Registration successful",
      participantId: newParticipant.id,
      walletAddress,
      username,
      email,
      name: fullName,
      full_name: fullName,
      referralCode: newReferralCode,
      referral_code: newReferralCode,
      bep20_address: walletAddress,
      wallet_balance: 0,
      account_balance: 0,
      bonus_balance: 0,
      total_referrals: 0,
      total_earnings: 0,
      status: "active",
      rank: "bronze",
      is_active: true,
      details_completed: false,
      serial_number: newParticipant.serial_number || "",
      created_at: newParticipant.created_at,
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
