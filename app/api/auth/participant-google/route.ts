import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") || ""
  const email = cookieHeader.match(/(?:^|; )participant_google_email=([^;]+)/)?.[1]
  if (!email) return NextResponse.json({ success: false, error: "Google session expired" }, { status: 401 })

  const participant = await queryOne<any>("SELECT id, email, username, name, full_name, wallet_address, bep20_address, activation_fee_paid, contribution_approved, contributed_amount, wallet_balance, account_balance, bonus_balance, created_at, is_frozen, status, details_completed, pin_hash FROM participants WHERE LOWER(email) = $1 LIMIT 1", [decodeURIComponent(email).toLowerCase()])
  if (!participant) return NextResponse.json({ success: false, error: "Participant account not found" }, { status: 404 })

  const response = NextResponse.json({ success: true, participantId: participant.id, ...participant, walletAddress: participant.wallet_address, pinConfigured: Boolean(participant.pin_hash) })
  response.cookies.set("participant_google_email", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" })
  return response
}
