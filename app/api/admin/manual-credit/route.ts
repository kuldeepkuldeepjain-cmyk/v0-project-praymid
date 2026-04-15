import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { email, amount } = await request.json()

    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid email or amount" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get participant
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, username, account_balance")
      .eq("email", email)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    // Update account balance
    const newBalance = Number(participant.account_balance || 0) + Number(amount)

    const { error: updateError } = await supabase
      .from("participants")
      .update({ account_balance: newBalance })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Failed to update wallet balance:", updateError)
      return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
    }

    // Log the activity
    await supabase.from("activity_logs").insert({
      action: "manual_credit",
      actor_id: participant.id,
      actor_email: "admin@system.com",
      target_type: "wallet",
      target_id: participant.id,
      details: `Manual credit of $${amount} to ${email} (New balance: $${newBalance})`,
    })

    console.log(`[v0] Manual credit successful: $${amount} to ${email}`)

    return NextResponse.json({
      success: true,
      message: `$${amount} credited to ${email}`,
      newBalance,
    })
  } catch (error) {
    console.error("[v0] Manual credit error:", error)
    return NextResponse.json({ error: "Failed to process credit" }, { status: 500 })
  }
}
