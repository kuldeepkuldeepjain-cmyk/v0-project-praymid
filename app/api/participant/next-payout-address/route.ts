import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()
    
    // Get the current user's email from query parameters
    const { searchParams } = new URL(request.url)
    const currentUserEmail = searchParams.get('email')
    
    console.log("[v0] Fetching payout address for user:", currentUserEmail)

    // Get the current user's serial number
    let currentUserSerial = null
    if (currentUserEmail) {
      const { data: currentUser } = await supabase
        .from("participants")
        .select("serial_number")
        .eq("email", currentUserEmail)
        .single()
      
      currentUserSerial = currentUser?.serial_number
      console.log("[v0] Current user serial number:", currentUserSerial)
    }

    // First priority: Check if there's a payout redirected to this user's serial number
    if (currentUserSerial) {
      const { data: serialRedirectedPayout, error: serialRedirectError } = await supabase
        .from("payout_requests")
        .select("wallet_address, participant_email, amount, created_at")
        .eq("status", "redirected")
        .eq("redirect_to_serial", currentUserSerial)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

      if (serialRedirectedPayout && !serialRedirectError) {
        console.log("[v0] Found serial-redirected payout for:", currentUserSerial, "->", serialRedirectedPayout.wallet_address)
        
        // Get participant name
        const { data: participant } = await supabase
          .from("participants")
          .select("username")
          .eq("email", serialRedirectedPayout.participant_email)
          .single()

        return NextResponse.json({
          success: true,
          address: serialRedirectedPayout.wallet_address,
          recipientName: participant?.username || serialRedirectedPayout.participant_email,
          recipientEmail: serialRedirectedPayout.participant_email,
          amount: serialRedirectedPayout.amount,
          requestedAt: serialRedirectedPayout.created_at,
          isAdminWallet: false,
          isRedirected: true,
          redirectType: "serial",
          message: `Pre-assigned payout for user ${currentUserSerial}`
        })
      }
    }

    // Second priority: Check if there's a payout redirected specifically to this user's email
    if (currentUserEmail) {
      const { data: redirectedPayout, error: redirectError } = await supabase
        .from("payout_requests")
        .select("wallet_address, participant_email, amount, created_at")
        .eq("status", "redirected")
        .eq("redirect_to_email", currentUserEmail)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

      if (redirectedPayout && !redirectError) {
        console.log("[v0] Found email-redirected payout for this user:", redirectedPayout.wallet_address)
        
        // Get participant name
        const { data: participant } = await supabase
          .from("participants")
          .select("username")
          .eq("email", redirectedPayout.participant_email)
          .single()

        return NextResponse.json({
          success: true,
          address: redirectedPayout.wallet_address,
          recipientName: participant?.username || redirectedPayout.participant_email,
          recipientEmail: redirectedPayout.participant_email,
          amount: redirectedPayout.amount,
          requestedAt: redirectedPayout.created_at,
          isAdminWallet: false,
          isRedirected: true,
          redirectType: "email",
          message: `Contributing to redirected payout request`
        })
      }
    }

    console.log("[v0] No redirect found, fetching oldest pending payout...")
    
    // If no redirect found, get the oldest pending payout request
    const { data: pendingPayout, error } = await supabase
      .from("payout_requests")
      .select("wallet_address, participant_email, amount, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      console.error("[v0] Error fetching pending payout:", error)
      throw error
    }

    if (!pendingPayout) {
      console.log("[v0] No pending payouts found, returning default admin address")
      // No pending payouts, return default admin wallet
      return NextResponse.json({
        success: true,
        address: "0x77704a0FBD161F3f615e1D550bB0EE50a469B938",
        isAdminWallet: true,
        message: "No pending payouts. Contributing to default admin wallet."
      })
    }

    // Get participant name from participants table
    const { data: participant } = await supabase
      .from("participants")
      .select("username")
      .eq("email", pendingPayout.participant_email)
      .single()

    console.log("[v0] Found pending payout:", {
      user: participant?.username || pendingPayout.participant_email,
      address: pendingPayout.wallet_address
    })

    return NextResponse.json({
      success: true,
      address: pendingPayout.wallet_address,
      recipientName: participant?.username || pendingPayout.participant_email,
      recipientEmail: pendingPayout.participant_email,
      amount: pendingPayout.amount,
      requestedAt: pendingPayout.created_at,
      isAdminWallet: false,
      message: `Contributing to user payout request`
    })

  } catch (error) {
    console.error("[v0] Error in next-payout-address:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch payout address",
        address: "0x77704a0FBD161F3f615e1D550bB0EE50a469B938",
        isAdminWallet: true
      },
      { status: 500 }
    )
  }
}
