import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { setParticipantSession } from "@/lib/session"

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

export async function POST(request: Request) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password, country, state, pinCode, countryCode, referralCode } = await request.json()

    if (!firstName || !lastName || !username || !email || !mobileNumber || !password) {
      return NextResponse.json({ success: false, error: "All required fields must be filled" }, { status: 400 })
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`

    const supabase = getServiceClient()

    const { data: existingEmail } = await supabase.from("participants").select("email").eq("email", email).maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
    }

    const { data: existingPhone } = await supabase
      .from("participants")
      .select("mobile_number")
      .eq("mobile_number", mobileNumber)
      .maybeSingle()

    if (existingPhone) {
      return NextResponse.json({ success: false, error: "Mobile number already registered" }, { status: 400 })
    }

    const { data: existingUsername } = await supabase
      .from("participants")
      .select("username")
      .eq("username", username.toLowerCase())
      .maybeSingle()

    if (existingUsername) {
      return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }

    let referrerData = null
    if (referralCode) {
      const { data: referrer } = await supabase
        .from("participants")
        .select("referral_code, email, username, total_referrals, account_balance")
        .eq("referral_code", referralCode.toUpperCase())
        .maybeSingle()

      if (!referrer) {
        return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
      }
      referrerData = referrer
    }

    const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`

    const newReferralCode = generateReferralCode(username)

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: newParticipant, error: insertError } = await supabase
      .from("participants")
      .insert({
        full_name: fullName,
        username: username.toLowerCase(),
        email,
        mobile_number: mobileNumber,
        password: hashedPassword,
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

    if (insertError) {
      return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 })
    }

    if (referrerData) {
      // Only increment referral count here. The $5 reward is credited only after
      // the referred participant completes their first P2P contribution cycle.
      const newReferralCount = (referrerData.total_referrals || 0) + 1

      await supabase
        .from("participants")
        .update({ total_referrals: newReferralCount })
        .eq("referral_code", referralCode.toUpperCase())

      const { data: referrerParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("referral_code", referralCode.toUpperCase())
        .single()

      if (referrerParticipant && mobileNumber) {
        const phoneDigits = mobileNumber.replace(/\D/g, "")
        const encoder = new TextEncoder()
        const data = encoder.encode(phoneDigits)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const phoneHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
        
        await supabase
          .from("invite_logs")
          .update({ 
            participant_email: newParticipant.email
          })
          .eq("participant_id", referrerParticipant.id)
          .eq("contact_hash", phoneHash)
      }
    }

    // Set secure httpOnly session cookie so user is logged in immediately
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
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
