import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

/**
 * Auto-match single contribution with payout after 30 minutes
 * Called via Upstash webhook after scheduled delay
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    console.log("[v0] Auto-match single contribution triggered")

    const { contributionId, participantEmail, delayedAt } = await request.json()

    if (!contributionId || !participantEmail) {
      return NextResponse.json(
        { error: "Missing contributionId or participantEmail" },
        { status: 400 }
      )
    }

    console.log(`[v0] Auto-matching contribution ${contributionId} for ${participantEmail}`)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[v0] Missing Supabase configuration")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    // Get the contribution
    const { data: contribution, error: contribError } = await supabase
      .from("payment_submissions")
      .select("id, status, matched_payout_id, amount")
      .eq("id", contributionId)
      .maybeSingle()

    if (contribError || !contribution) {
      console.log("[v0] Contribution not found:", contributionId)
      return NextResponse.json(
        { error: "Contribution not found", success: false },
        { status: 404 }
      )
    }

    // Check if already matched
    if (contribution.matched_payout_id) {
      console.log("[v0] Contribution already matched:", contributionId)
      return NextResponse.json({
        success: true,
        message: "Contribution already matched",
        alreadyMatched: true,
      })
    }

    // Check if contribution is approved
    if (contribution.status !== "approved") {
      console.log("[v0] Contribution not approved yet:", contributionId, "Status:", contribution.status)
      return NextResponse.json({
        success: true,
        message: "Contribution not yet approved, skipping auto-match",
        notApproved: true,
      })
    }

    // Find oldest pending payout for this participant (FIFO)
    const { data: payouts, error: payoutError } = await supabase
      .from("payout_requests")
      .select("id, serial_number, status")
      .eq("participant_email", participantEmail)
      .eq("status", "pending")
      .is("matched_contribution_id", null)
      .order("created_at", { ascending: true })
      .limit(1)

    if (payoutError || !payouts || payouts.length === 0) {
      console.log(`[v0] No pending payout found for ${participantEmail}`)
      return NextResponse.json({
        success: true,
        message: "No pending payout found for participant",
        matched: false,
      })
    }

    const payout = payouts[0]
    console.log(`[v0] Found matching payout #${payout.serial_number} for contribution ${contributionId}`)

    const now = new Date().toISOString()

    // Match the contribution with payout
    const { error: matchError } = await supabase
      .from("payment_submissions")
      .update({
        matched_payout_id: payout.id,
        matched_at: now,
      })
      .eq("id", contributionId)

    if (matchError) {
      console.error("[v0] Error matching contribution:", matchError)
      return NextResponse.json(
        { error: "Failed to match contribution", details: matchError.message },
        { status: 500 }
      )
    }

    // Update payout with matched contribution
    const { error: payoutUpdateError } = await supabase
      .from("payout_requests")
      .update({
        matched_contribution_id: contributionId,
        matched_at: now,
        status: "in_process",
      })
      .eq("id", payout.id)

    if (payoutUpdateError) {
      console.error("[v0] Error updating payout:", payoutUpdateError)
      // Rollback contribution update
      await supabase
        .from("payment_submissions")
        .update({ matched_payout_id: null, matched_at: null })
        .eq("id", contributionId)
      
      return NextResponse.json(
        { error: "Failed to update payout", details: payoutUpdateError.message },
        { status: 500 }
      )
    }

    // Send notification to participant
    await supabase
      .from("notifications")
      .insert({
        user_email: participantEmail,
        type: "success",
        title: "Contribution Auto-Matched",
        message: `Your contribution has been automatically matched with payout request #${payout.serial_number}. Processing in progress.`,
        read_status: false,
      })
      .catch((err) => {
        console.warn("[v0] Failed to send notification:", err)
      })

    // Log activity
    await supabase
      .from("activity_logs")
      .insert({
        actor_email: "system",
        action: "auto_match_contribution_30min",
        details: `Auto-matched contribution ${contributionId} with payout #${payout.serial_number} (30min after submission)`,
        target_type: "payment_submission",
      })
      .catch((err) => {
        console.warn("[v0] Failed to log activity:", err)
      })

    console.log(`[v0] Successfully auto-matched contribution ${contributionId} with payout #${payout.serial_number}`)

    return NextResponse.json({
      success: true,
      message: "Contribution auto-matched successfully",
      matched: true,
      contributionId,
      payoutSerialNumber: payout.serial_number,
      payoutId: payout.id,
    })
  } catch (error) {
    console.error("[v0] Error in auto-match single contribution:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
