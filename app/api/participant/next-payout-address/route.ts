import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const currentUserEmail = searchParams.get("email")

    console.log("[v0] Fetching payout address for user:", currentUserEmail)

    // Get the current user's serial number
    let currentUserSerial = null
    if (currentUserEmail) {
      const result = await query(
        `SELECT serial_number FROM participants WHERE email = $1 LIMIT 1`,
        [currentUserEmail]
      )
      currentUserSerial = result[0]?.serial_number
      console.log("[v0] Current user serial number:", currentUserSerial)
    }

    // First priority: Check if there's a payout redirected to this user's serial number
    if (currentUserSerial) {
      const result = await query(
        `SELECT wallet_address, participant_email, amount, created_at 
         FROM payout_requests 
         WHERE status = $1 AND redirect_to_serial = $2 
         ORDER BY created_at ASC LIMIT 1`,
        ["redirected", currentUserSerial]
      )

      if (result.length > 0) {
        const serialRedirectedPayout = result[0]
        console.log(
          "[v0] Found serial-redirected payout for:",
          currentUserSerial,
          "->",
          serialRedirectedPayout.wallet_address
        )

        // Get participant name
        const participantResult = await query(
          `SELECT username FROM participants WHERE email = $1 LIMIT 1`,
          [serialRedirectedPayout.participant_email]
        )

        return NextResponse.json({
          success: true,
          address: serialRedirectedPayout.wallet_address,
          recipientName: participantResult[0]?.username || serialRedirectedPayout.participant_email,
          recipientEmail: serialRedirectedPayout.participant_email,
          amount: serialRedirectedPayout.amount,
          requestedAt: serialRedirectedPayout.created_at,
          isAdminWallet: false,
          isRedirected: true,
          redirectType: "serial",
          message: `Pre-assigned payout for user ${currentUserSerial}`,
        })
      }
    }

    // Second priority: Check if there's a payout redirected specifically to this user's email
    if (currentUserEmail) {
      const result = await query(
        `SELECT wallet_address, participant_email, amount, created_at 
         FROM payout_requests 
         WHERE status = $1 AND redirect_to_email = $2 
         ORDER BY created_at ASC LIMIT 1`,
        ["redirected", currentUserEmail]
      )

      if (result.length > 0) {
        const redirectedPayout = result[0]
        console.log("[v0] Found email-redirected payout for this user:", redirectedPayout.wallet_address)

        // Get participant name
        const participantResult = await query(
          `SELECT username FROM participants WHERE email = $1 LIMIT 1`,
          [redirectedPayout.participant_email]
        )

        return NextResponse.json({
          success: true,
          address: redirectedPayout.wallet_address,
          recipientName: participantResult[0]?.username || redirectedPayout.participant_email,
          recipientEmail: redirectedPayout.participant_email,
          amount: redirectedPayout.amount,
          requestedAt: redirectedPayout.created_at,
          isAdminWallet: false,
          isRedirected: true,
          redirectType: "email",
          message: `Contributing to redirected payout request`,
        })
      }
    }

    console.log("[v0] No redirect found, fetching oldest pending payout...")

    // If no redirect found, get the oldest pending payout request
    const result = await query(
      `SELECT wallet_address, participant_email, amount, created_at 
       FROM payout_requests 
       WHERE status = $1 
       ORDER BY created_at ASC LIMIT 1`,
      ["pending"]
    )

    if (result.length === 0) {
      console.log("[v0] No pending payouts found, returning default admin address")
      return NextResponse.json({
        success: true,
        address: "0x77704a0FBD161F3f615e1D550bB0EE50a469B938",
        isAdminWallet: true,
        message: "No pending payouts. Contributing to default admin wallet.",
      })
    }

    const pendingPayout = result[0]

    // Get participant name from participants table
    const participantResult = await query(
      `SELECT username FROM participants WHERE email = $1 LIMIT 1`,
      [pendingPayout.participant_email]
    )

    console.log("[v0] Found pending payout:", {
      user: participantResult[0]?.username || pendingPayout.participant_email,
      address: pendingPayout.wallet_address,
    })

    return NextResponse.json({
      success: true,
      address: pendingPayout.wallet_address,
      recipientName: participantResult[0]?.username || pendingPayout.participant_email,
      recipientEmail: pendingPayout.participant_email,
      amount: pendingPayout.amount,
      requestedAt: pendingPayout.created_at,
      isAdminWallet: false,
      message: `Contributing to user payout request`,
    })
  } catch (error) {
    console.error("[v0] Error in next-payout-address:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payout address",
        address: "0x77704a0FBD161F3f615e1D550bB0EE50a469B938",
        isAdminWallet: true,
      },
      { status: 500 }
    )
  }
}
