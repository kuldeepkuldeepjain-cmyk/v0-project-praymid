import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { setParticipantSession } from "@/lib/session"

export async function POST(request: Request) {
  const { credential } = await request.json().catch(() => ({ credential: "" }))
  if (!credential || typeof credential !== "string") return NextResponse.json({ success: false, error: "Google credential is required" }, { status: 400 })

  const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { cache: "no-store" })
  if (!tokenResponse.ok) return NextResponse.json({ success: false, error: "Invalid Google credential" }, { status: 401 })
  const googleUser = await tokenResponse.json()
  const configuredClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  if (configuredClientId && googleUser.aud !== configuredClientId) return NextResponse.json({ success: false, error: "Invalid Google audience" }, { status: 401 })
  if (googleUser.email_verified !== "true" || !googleUser.email) return NextResponse.json({ success: false, error: "Verified Google email required" }, { status: 401 })

  const participant = await queryOne<any>("SELECT id, email, username, name, full_name, wallet_address, bep20_address, activation_fee_paid, contribution_approved, contributed_amount, wallet_balance, account_balance, bonus_balance, created_at, is_frozen, status, details_completed, pin_hash FROM participants WHERE LOWER(email) = $1 LIMIT 1", [googleUser.email.toLowerCase()])
  if (!participant) return NextResponse.json({ success: false, error: "No registered participant account found for this Google email" }, { status: 404 })

  await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant" })
  return NextResponse.json({ success: true, participantId: participant.id, ...participant, walletAddress: participant.wallet_address, pinConfigured: Boolean(participant.pin_hash) })
}
