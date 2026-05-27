import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const DEFAULT_ADMIN_WALLET = "0x77704a0FBD161F3f615e1D550bB0EE50a469B938"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const currentUserEmail = searchParams.get("email")

    // 1. Check redirect by serial number
    if (currentUserEmail) {
      const userRows = await sql`
        SELECT serial_number FROM participants WHERE email = ${currentUserEmail}
      `
      const currentUserSerial = userRows[0]?.serial_number

      if (currentUserSerial) {
        const serialRows = await sql`
          SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at,
                 p.username
          FROM payout_requests pr
          LEFT JOIN participants p ON p.email = pr.participant_email
          WHERE pr.status = 'redirected' AND pr.redirect_to_serial = ${currentUserSerial}
          ORDER BY pr.created_at ASC
          LIMIT 1
        `
        if (serialRows[0]) {
          const r = serialRows[0]
          return NextResponse.json({
            success: true,
            address: r.wallet_address,
            recipientName: r.username || r.participant_email,
            recipientEmail: r.participant_email,
            amount: r.amount,
            requestedAt: r.created_at,
            isAdminWallet: false,
            isRedirected: true,
            redirectType: "serial",
          })
        }
      }

      // 2. Check redirect by email
      const emailRows = await sql`
        SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at,
               p.username
        FROM payout_requests pr
        LEFT JOIN participants p ON p.email = pr.participant_email
        WHERE pr.status = 'redirected' AND pr.redirect_to_email = ${currentUserEmail}
        ORDER BY pr.created_at ASC
        LIMIT 1
      `
      if (emailRows[0]) {
        const r = emailRows[0]
        return NextResponse.json({
          success: true,
          address: r.wallet_address,
          recipientName: r.username || r.participant_email,
          recipientEmail: r.participant_email,
          amount: r.amount,
          requestedAt: r.created_at,
          isAdminWallet: false,
          isRedirected: true,
          redirectType: "email",
        })
      }
    }

    // 3. Oldest pending payout
    const pendingRows = await sql`
      SELECT pr.wallet_address, pr.participant_email, pr.amount, pr.created_at,
             p.username
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC
      LIMIT 1
    `

    if (!pendingRows[0]) {
      return NextResponse.json({
        success: true,
        address: DEFAULT_ADMIN_WALLET,
        isAdminWallet: true,
        message: "No pending payouts. Contributing to default admin wallet.",
      })
    }

    const r = pendingRows[0]
    return NextResponse.json({
      success: true,
      address: r.wallet_address,
      recipientName: r.username || r.participant_email,
      recipientEmail: r.participant_email,
      amount: r.amount,
      requestedAt: r.created_at,
      isAdminWallet: false,
    })
  } catch (error) {
    console.error("[next-payout-address] error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch payout address", address: DEFAULT_ADMIN_WALLET, isAdminWallet: true },
      { status: 500 }
    )
  }
}
