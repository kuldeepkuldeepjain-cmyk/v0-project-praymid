import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Find all participants whose activation deadline has passed and haven't paid
    const { data: expiredParticipants, error: findError } = await supabase
      .from("participants")
      .select("*")
      .eq("activation_fee_paid", false)
      .eq("account_frozen", false)
      .lt("activation_deadline", new Date().toISOString())

    if (findError) {
      console.error("[v0] Error finding expired participants:", findError)
      return NextResponse.json({ success: false, error: "Failed to check expired accounts" }, { status: 500 })
    }

    if (!expiredParticipants || expiredParticipants.length === 0) {
      return NextResponse.json({ success: true, message: "No expired accounts found", blockedCount: 0 })
    }

    // Block all expired participants
    const participantIds = expiredParticipants.map((p) => p.id)

    const { error: updateError } = await supabase
      .from("participants")
      .update({ account_frozen: true, status: "blocked" })
      .in("id", participantIds)

    if (updateError) {
      console.error("[v0] Error blocking expired participants:", updateError)
      return NextResponse.json({ success: false, error: "Failed to block accounts" }, { status: 500 })
    }

    // Log activity for each blocked account
    for (const participant of expiredParticipants) {
      await supabase.from("activity_logs").insert({
        action: "account_blocked",
        actor_id: participant.id,
        actor_email: participant.email,
        target_type: "participant",
        details: `Account automatically blocked: Failed to pay activation fee within 24 hours. Deadline was ${participant.activation_deadline}`,
      })
    }

    console.log(`[v0] Blocked ${expiredParticipants.length} expired accounts`)

    return NextResponse.json({
      success: true,
      message: `Blocked ${expiredParticipants.length} expired accounts`,
      blockedCount: expiredParticipants.length,
      blockedEmails: expiredParticipants.map((p) => p.email),
    })
  } catch (error) {
    console.error("[v0] Check expired error:", error)
    return NextResponse.json({ success: false, error: "Failed to check expired accounts" }, { status: 500 })
  }
}
