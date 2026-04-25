import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"
import { participantMemoryStore } from "@/lib/participant-memory-store"
import type { MemoryParticipant } from "@/lib/participant-memory-store"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

    // Try Supabase first
    try {
      const supabase = getServiceClient()

      const { data: existingEmail } = await supabase.from("participants").select("email").eq("email", email).maybeSingle()
      if (existingEmail) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })

      const { data: existingPhone } = await supabase.from("participants").select("mobile_number").eq("mobile_number", mobileNumber).maybeSingle()
      if (existingPhone) return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })

      const { data: existingUsername } = await supabase.from("participants").select("username").eq("username", username.toLowerCase()).maybeSingle()
      if (existingUsername) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })

      if (referralCode) {
        const { data: referrer } = await supabase.from("participants").select("referral_code").eq("referral_code", referralCode.toUpperCase()).maybeSingle()
        if (!referrer) return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
      }

      const { data: newParticipant, error: insertError } = await supabase
        .from("participants")
        .insert({
          full_name: fullName,
          username: username.toLowerCase(),
          email: emailKey,
          mobile_number: mobileNumber,
          password: hashedPassword,
          plain_password: password,
          wallet_address: walletAddress,
          country: country || "",
          country_code: countryCode || "",
          state: state || "",
          pin_code: pinCode || "",
          status: "active",
          rank: "bronze",
          referral_code: newReferralCode,
          referred_by: referralCode ? referralCode.toUpperCase() : null,
          total_referrals: 0,
          total_earnings: 0,
          account_balance: 0,
          bonus_balance: 0,
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      // Update referrer count
      if (referralCode) {
        const { data: ref } = await supabase.from("participants").select("total_referrals").eq("referral_code", referralCode.toUpperCase()).maybeSingle().catch(() => ({ data: null }))
        if (ref) {
          await supabase.from("participants").update({ total_referrals: (ref.total_referrals || 0) + 1 }).eq("referral_code", referralCode.toUpperCase()).catch(() => {})
        }
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

    // --- Memory store fallback (v0 preview / DB unreachable) ---

    // Check duplicates in memory store
    for (const p of participantMemoryStore.values()) {
      if (p.email === emailKey) return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
      if (p.mobile_number === mobileNumber) return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })
      if (p.username === username.toLowerCase()) return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }

    const participantId = generateId()
    const memParticipant: MemoryParticipant = {
      id: participantId,
      email: emailKey,
      username: username.toLowerCase(),
      full_name: fullName,
      password: hashedPassword,
      plain_password: password,
      mobile_number: mobileNumber,
      wallet_address: walletAddress,
      referral_code: newReferralCode,
      referred_by: referralCode ? referralCode.toUpperCase() : null,
      country: country || "",
      state: state || "",
      pin_code: pinCode || "",
      country_code: countryCode || "",
      account_balance: 0,
      bonus_balance: 0,
      total_earnings: 0,
      total_referrals: 0,
      status: "active",
      rank: "bronze",
      is_active: true,
      details_completed: false,
      created_at: createdAt,
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
