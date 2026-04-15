import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

// Get an available wallet address from the pool
export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()

    // Get all active wallets not currently assigned
    const { data: wallets, error } = await supabase
      .from("wallet_pool")
      .select("*")
      .eq("status", "active")
      .is("assigned_to", null)
      .order("last_transaction", { ascending: true, nullsFirst: true })
      .limit(10)

    if (error) {
      console.error("[v0] Failed to fetch wallet pool:", error)
      return NextResponse.json({ error: "Failed to fetch wallet addresses" }, { status: 500 })
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({
        address: null,
        message: "No available wallets in pool",
      })
    }

    // Select a random wallet from available ones
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)]

    return NextResponse.json({
      id: randomWallet.id,
      address: randomWallet.wallet_address,
      network: randomWallet.network,
    })
  } catch (error) {
    console.error("[v0] Error fetching wallet from pool:", error)
    return NextResponse.json({ error: "Failed to get wallet address" }, { status: 500 })
  }
}

// Add or update wallet address in the pool
export async function POST(request: Request) {
  try {
    const { walletAddress, network, assignedTo } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if wallet already exists
    const { data: existingWallet } = await supabase
      .from("wallet_pool")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (existingWallet) {
      // Update existing wallet
      const { error: updateError } = await supabase
        .from("wallet_pool")
        .update({
          status: assignedTo ? "assigned" : "active",
          assigned_to: assignedTo || null,
        })
        .eq("id", existingWallet.id)

      if (updateError) {
        console.error("[v0] Failed to update wallet pool:", updateError)
        return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Wallet updated successfully",
      })
    } else {
      // Insert new wallet
      const { error: insertError } = await supabase.from("wallet_pool").insert({
        wallet_address: walletAddress,
        network: network || "BSC",
        status: assignedTo ? "assigned" : "active",
        assigned_to: assignedTo || null,
      })

      if (insertError) {
        console.error("[v0] Failed to insert wallet pool:", insertError)
        return NextResponse.json({ error: "Failed to add wallet" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Wallet added to pool successfully",
      })
    }
  } catch (error) {
    console.error("[v0] Error managing wallet pool:", error)
    return NextResponse.json({ error: "Failed to manage wallet pool" }, { status: 500 })
  }
}
