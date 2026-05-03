import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const ADMIN_WALLET = process.env.COMPANY_WALLET_ADDRESS || "0x77704a0FBD161F3f615e1D550bB0EE50a469B938"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const currentUserEmail = request.nextUrl.searchParams.get("email")

    // 1. Check for serial-redirected payout
    if (currentUserEmail) {
      const me = await sql`SELECT serial_number FROM participants WHERE email = ${currentUserEmail} LIMIT 1`
      const serial = me[0]?.serial_number
      if (serial) {
        const rows = await sql`
          SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at, p.username
          FROM payout_requests pr LEFT JOIN participants p ON p.email = pr.participant_email
          WHERE pr.status = 'redirected' AND pr.redirect_to_serial = ${String(serial)}
          ORDER BY pr.created_at ASC LIMIT 1
        `
        if (rows[0]) return NextResponse.json({ success: true, address: rows[0].wallet_address, recipientName: rows[0].username || rows[0].participant_email, recipientEmail: rows[0].participant_email, amount: rows[0].amount, isAdminWallet: false, isRedirected: true, redirectType: "serial" })
      }
    }

    // 2. Check for email-redirected payout
    if (currentUserEmail) {
      const rows = await sql`
        SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at, p.username
        FROM payout_requests pr LEFT JOIN participants p ON p.email = pr.participant_email
        WHERE pr.status = 'redirected' AND pr.redirect_to_email = ${currentUserEmail}
        ORDER BY pr.created_at ASC LIMIT 1
      `
      if (rows[0]) return NextResponse.json({ success: true, address: rows[0].wallet_address, recipientName: rows[0].username || rows[0].participant_email, recipientEmail: rows[0].participant_email, amount: rows[0].amount, isAdminWallet: false, isRedirected: true, redirectType: "email" })
    }

    // 3. Oldest pending payout
    const rows = await sql`
      SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at, p.username
      FROM payout_requests pr LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ success: true, address: ADMIN_WALLET, isAdminWallet: true, message: "No pending payouts. Contributing to default admin wallet." })

    return NextResponse.json({
      success: true,
      address: rows[0].wallet_address,
      recipientName: rows[0].username || rows[0].participant_email,
      recipientEmail: rows[0].participant_email,
      amount: rows[0].amount,
      isAdminWallet: false,
      message: "Contributing to user payout request",
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch payout address", address: ADMIN_WALLET, isAdminWallet: true }, { status: 500 })
  }
}
