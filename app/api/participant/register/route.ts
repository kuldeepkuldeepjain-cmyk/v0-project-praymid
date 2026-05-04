import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { participantMemoryStore } from "@/lib/participant-memory-store"
import { query, queryOne } from "@/lib/db"
import type { MemoryParticipant } from "@/lib/participant-memory-store"

function generateReferralCode(username: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
  const userPrefix = username.substring(0, 3).toUpperCase()
  return `${userPrefix}${randomStr}`
}

function generateId(): string {
  return `preview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function generateWallet(): string {
  return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode } = await request.json()

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, error: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const emailKey = email.toLowerCase().trim()
    const walletAddress = generateWallet()
    const newReferralCode = generateReferralCode(username)
    const hashedPassword = await bcrypt.hash(password, 10)
    const createdAt = new Date().toISOString()

    // Try pg DB first
    try {
      const existingEmail = await queryOne(`SELECT email FROM participants WHERE email = $1`, [emailKey])
      if (existingEmail) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })

      const existingPhone = await queryOne(`SELECT mobile_number FROM participants WHERE mobile_number = $1`, [mobileNumber])
      if (existingPhone) return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })

      const existingUsername = await queryOne(`SELECT username FROM participants WHERE username = $1`, [username.toLowerCase()])
      if (existingUsername) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })

      if (referralCode) {
        const referrer = await queryOne(`SELECT referral_code FROM participants WHERE referral_code = $1`, [referralCode.toUpperCase()])
        if (!referrer) return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
      }

      const rows = await query(
        `INSERT INTO participants (full_name, username, email, mobile_number, password, plain_password, wallet_address, country, country_code, state, pin_code, status, rank, referral_code, referred_by, total_referrals, total_earnings, account_balance, bonus_balance, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active','bronze',$12,$13,0,0,0,0,true) RETURNING *`,
        [fullName, username.toLowerCase(), emailKey, mobileNumber, hashedPassword, password, walletAddress,
         country || "", countryCode || "", state || "", pinCode || "", newReferralCode,
         referralCode ? referralCode.toUpperCase() : null]
      )
      const newParticipant = rows[0]

      if (referralCode) {
        await query(`UPDATE participants SET total_referrals = total_referrals + 1 WHERE referral_code = $1`, [referralCode.toUpperCase()]).catch(() => {})
      }

      await setParticipantSession({ participantId: newParticipant.id, email: newParticipant.email, role: "participant" })

      return NextResponse.json({
        success: true, message: "Registration successful",
        participantId: newParticipant.id, walletAddress, username: username.toLowerCase(), email: emailKey,
        name: fullName, full_name: fullName, referralCode: newReferralCode, referral_code: newReferralCode,
        bep20_address: walletAddress, wallet_balance: 0, account_balance: 0, bonus_balance: 0,
        total_referrals: 0, total_earnings: 0, status: "active", rank: "bronze", is_active: true,
        details_completed: false, serial_number: newParticipant.serial_number || "", created_at: newParticipant.created_at,
      })
    } catch (dbErr) {
      console.error("[register] DB unavailable, using memory store:", dbErr instanceof Error ? dbErr.message : dbErr)
    }

    // --- Memory store fallback ---
    for (const p of participantMemoryStore.values()) {
      if (p.email === emailKey) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
      if (p.mobile_number === mobileNumber) return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })
      if (p.username === username.toLowerCase()) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }

    const participantId = generateId()
    const memParticipant: MemoryParticipant = {
      id: participantId, email: emailKey, username: username.toLowerCase(), full_name: fullName,
      password: hashedPassword, plain_password: password, mobile_number: mobileNumber,
      wallet_address: walletAddress, referral_code: newReferralCode,
      referred_by: referralCode ? referralCode.toUpperCase() : null,
      country: country || "", state: state || "", pin_code: pinCode || "", country_code: countryCode || "",
      account_balance: 0, bonus_balance: 0, total_earnings: 0, total_referrals: 0,
      status: "active", rank: "bronze", is_active: true, details_completed: false, created_at: createdAt,
    }
    participantMemoryStore.set(emailKey, memParticipant)
    await setParticipantSession({ participantId, email: emailKey, role: "participant" })

    return NextResponse.json({
      success: true, message: "Registration successful",
      participantId, walletAddress, username: username.toLowerCase(), email: emailKey,
      name: fullName, full_name: fullName, referralCode: newReferralCode, referral_code: newReferralCode,
      bep20_address: walletAddress, wallet_balance: 0, account_balance: 0, bonus_balance: 0,
      total_referrals: 0, total_earnings: 0, status: "active", rank: "bronze", is_active: true,
      details_completed: false, serial_number: "", created_at: createdAt,
    })
  } catch (error: any) {
    console.error("[register] Unexpected error:", error)
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
