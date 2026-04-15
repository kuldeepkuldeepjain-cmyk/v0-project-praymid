import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { email, full_name, wallet_address, full_address } = body

    // Validation
    if (!email || !full_name || !wallet_address || !full_address) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Basic BEP20 address validation (starts with 0x and 42 characters long)
    if (!wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Invalid BEP20 wallet address format" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if wallet address is already used by another user
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("participants")
      .select("email")
      .eq("wallet_address", wallet_address)
      .neq("email", email)
      .single()

    if (existingWallet) {
      return NextResponse.json(
        { error: "This wallet address is already registered to another account" },
        { status: 400 }
      )
    }

    // Update participant record with user details
    const { data, error } = await supabase
      .from("participants")
      .update({
        full_name,
        wallet_address,
        full_address,
        details_completed: true,
        username: full_name.split(" ")[0].toLowerCase(), // Set username from first name
      })
      .eq("email", email)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating participant profile:", error)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    // Update localStorage data
    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      data: data,
    })
  } catch (error) {
    console.error("[v0] Error in complete-profile route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
