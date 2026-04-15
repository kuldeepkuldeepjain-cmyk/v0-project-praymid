import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

const PAYOUT_TIMEOUT_HOURS = 24 // Redirect if not completed within 24 hours

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()

    console.log("[v0] Starting auto-redirect of expired payouts...")

    // Find all pending payouts that were created more than PAYOUT_TIMEOUT_HOURS ago
    const cutoffTime = new Date(Date.now() - PAYOUT_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString()

    const { data: expiredPayouts, error: fetchError } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", cutoffTime)
      .order("created_at", { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error("[v0] Error fetching expired payouts:", fetchError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch expired payouts" },
        { status: 500 }
      )
    }

    if (!expiredPayouts || expiredPayouts.length === 0) {
      console.log("[v0] No expired payouts found")
      return NextResponse.json({
        success: true,
        message: "No expired payouts to redirect",
        redirectedCount: 0,
      })
    }

    let redirectedCount = 0
    const redirectResults = []

    // Process each expired payout
    for (const payout of expiredPayouts) {
      try {
        // Find the next available participant (excluding the original participant)
        const { data: nextParticipants, error: participantError } = await supabase
          .from("participants")
          .select("id, email, username, full_name, account_balance")
          .neq("email", payout.participant_email)
          .order("created_at", { ascending: false })
          .limit(5)

        if (participantError || !nextParticipants || nextParticipants.length === 0) {
          console.error("[v0] Error finding next participant for payout:", payout.id)
          continue
        }

        // Use the most recent participant
        const nextParticipant = nextParticipants[0]

        // Update participant balance
        const newBalance = Number(nextParticipant.account_balance) + Number(payout.amount)

        const { error: updateBalanceError } = await supabase
          .from("participants")
          .update({ account_balance: newBalance })
          .eq("id", nextParticipant.id)

        if (updateBalanceError) {
          console.error("[v0] Error updating participant balance:", updateBalanceError)
          continue
        }

        // Create transaction record
        const { error: txError } = await supabase
          .from("transactions")
          .insert({
            participant_email: nextParticipant.email,
            participant_id: nextParticipant.id,
            type: "payout_redirect",
            amount: payout.amount,
            balance_before: nextParticipant.account_balance,
            balance_after: newBalance,
            description: `Auto-redirected payout from expired request #${payout.id} (original: ${payout.participant_email})`,
            reference_id: `AUTO_REDIRECT_${payout.id}`,
          })

        if (txError) {
          console.error("[v0] Error creating transaction:", txError)
        }

        // Update payout request to redirected status
        const { error: payoutUpdateError } = await supabase
          .from("payout_requests")
          .update({
            status: "redirected",
            redirect_to_email: nextParticipant.email,
            admin_notes: `Auto-redirected after ${PAYOUT_TIMEOUT_HOURS} hours of inactivity. Original recipient: ${payout.participant_email}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", payout.id)

        if (payoutUpdateError) {
          console.error("[v0] Error updating payout request:", payoutUpdateError)
          continue
        }

        // Send notification to new participant
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_email: nextParticipant.email,
            type: "payout_received",
            title: "Payout Redirected to Your Account",
            message: `You have received a redirected payout of $${payout.amount}. Your new balance is $${newBalance.toFixed(2)}.`,
          })

        if (notifError) {
          console.error("[v0] Error sending notification:", notifError)
        }

        // Log activity
        const { error: logError } = await supabase
          .from("activity_logs")
          .insert({
            actor_email: "system_auto_redirect",
            action: "payout_auto_redirected",
            target_type: "payout",
            target_id: payout.id,
            details: `Auto-redirected payout $${payout.amount} from ${payout.participant_email} to ${nextParticipant.email} after ${PAYOUT_TIMEOUT_HOURS}h timeout`,
          })

        if (logError) {
          console.error("[v0] Error creating activity log:", logError)
        }

        redirectResults.push({
          payoutId: payout.id,
          originalRecipient: payout.participant_email,
          newRecipient: nextParticipant.email,
          amount: payout.amount,
          status: "success",
        })

        redirectedCount++
        console.log(
          `[v0] Successfully redirected payout ${payout.id} to ${nextParticipant.email}`
        )
      } catch (error) {
        console.error(`[v0] Error processing payout ${payout.id}:`, error)
        redirectResults.push({
          payoutId: payout.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-redirect completed. ${redirectedCount} payouts redirected.`,
      redirectedCount,
      results: redirectResults,
    })
  } catch (error) {
    console.error("[v0] Error in auto-redirect-expired-payouts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
