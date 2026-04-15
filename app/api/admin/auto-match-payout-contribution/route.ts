import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

/**
 * Auto-match payout requests with approved contributions
 * if not matched manually by admin within 30 minutes
 * Runs on first-come-first-served basis
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    console.log("[v0] Auto-match payout-contribution cron triggered")
    
    // Verify this is called from a cron service
    // Check for Vercel cron header OR Bearer token
    const vercelCronHeader = request.headers.get("x-vercel-cron")
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    // Allow if:
    // 1. Called from Vercel cron (has x-vercel-cron header)
    // 2. OR has valid Bearer token
    const isValidCron = vercelCronHeader === "true" || authHeader === `Bearer ${cronSecret}`
    
    if (!isValidCron) {
      console.warn("[v0] Invalid cron authentication attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get current time
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

    console.log("[v0] Searching for unmatched contributions from before:", thirtyMinutesAgo.toISOString())

    // Step 1: Find all approved contributions that are NOT yet matched and were approved more than 30 minutes ago
    const { data: unmatchedContributions, error: contribError } = await supabase
      .from("payment_submissions")
      .select("id, participant_email, amount, reviewed_at")
      .eq("status", "approved")
      .is("matched_payout_id", null)
      .lte("reviewed_at", thirtyMinutesAgo.toISOString())
      .order("reviewed_at", { ascending: true }) // FIFO - oldest first
      .limit(50) // Process up to 50 at a time

    if (contribError) {
      console.error("[v0] Error fetching unmatched contributions:", contribError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch contributions", details: contribError.message },
        { status: 500 }
      )
    }

    if (!unmatchedContributions || unmatchedContributions.length === 0) {
      console.log("[v0] No unmatched contributions found for auto-matching")
      return NextResponse.json({
        success: true,
        message: "No contributions to auto-match",
        matchedCount: 0,
        timestamp: now.toISOString(),
      })
    }

    console.log(`[v0] Found ${unmatchedContributions.length} unmatched contributions, starting auto-match process`)

    let matchedCount = 0
    const matchResults = []

    // Step 2: For each unmatched contribution, find the oldest pending payout for the same participant
    for (const contribution of unmatchedContributions) {
      try {
        console.log(`[v0] Processing contribution ${contribution.id} for ${contribution.participant_email}`)
        
        // Find oldest pending payout for this participant (FIFO)
        const { data: payouts, error: payoutError } = await supabase
          .from("payout_requests")
          .select("id, serial_number")
          .eq("participant_email", contribution.participant_email)
          .eq("status", "pending")
          .is("matched_contribution_id", null)
          .order("created_at", { ascending: true })
          .limit(1)

        if (payoutError || !payouts || payouts.length === 0) {
          console.log(`[v0] No pending payout found for ${contribution.participant_email}, skipping`)
          // No pending payout for this participant, skip
          matchResults.push({
            contribution_id: contribution.id,
            status: "skipped",
            reason: "No pending payout found",
          })
          continue
        }

        const payout = payouts[0]
        console.log(`[v0] Found matching payout #${payout.serial_number}`)

        // Step 3: Match the contribution with the payout
        const { error: matchError } = await supabase
          .from("payment_submissions")
          .update({
            matched_payout_id: payout.id,
            matched_at: now.toISOString(),
          })
          .eq("id", contribution.id)

        if (matchError) {
          console.error(`[v0] Error matching contribution ${contribution.id}:`, matchError)
          matchResults.push({
            contribution_id: contribution.id,
            payout_id: payout.id,
            status: "failed",
            error: matchError.message,
          })
          continue
        }

        // Step 4: Update payout request with matched contribution
        const { error: payoutUpdateError } = await supabase
          .from("payout_requests")
          .update({
            matched_contribution_id: contribution.id,
            matched_at: now.toISOString(),
            status: "in_process",
          })
          .eq("id", payout.id)

        if (payoutUpdateError) {
          console.error(`[v0] Error updating payout ${payout.id}:`, payoutUpdateError)
          // Rollback the contribution update
          await supabase
            .from("payment_submissions")
            .update({ matched_payout_id: null, matched_at: null })
            .eq("id", contribution.id)

          matchResults.push({
            contribution_id: contribution.id,
            payout_id: payout.id,
            status: "failed",
            error: payoutUpdateError.message,
          })
          continue
        }

        // Step 5: Send notification to participant
        await supabase
          .from("notifications")
          .insert({
            user_email: contribution.participant_email,
            type: "success",
            title: "Payout Matched",
            message: `Your contribution has been automatically matched with payout request #${payout.serial_number}. Processing in progress.`,
            read_status: false,
          })
          .catch((err) => {
            console.warn(`[v0] Failed to send notification to ${contribution.participant_email}:`, err)
          }) // Non-fatal

        // Step 6: Log the auto-match activity
        await supabase
          .from("activity_logs")
          .insert({
            actor_email: "system",
            action: "auto_match_payout_contribution",
            details: `Auto-matched contribution ${contribution.id} with payout #${payout.serial_number} for ${contribution.participant_email}`,
            target_type: "payment_submission",
          })
          .catch((err) => {
            console.warn("[v0] Failed to log auto-match activity:", err)
          }) // Non-fatal

        matchedCount++
        console.log(`[v0] Successfully matched contribution ${contribution.id} with payout #${payout.serial_number}`)
        matchResults.push({
          contribution_id: contribution.id,
          payout_id: payout.id,
          payout_serial: payout.serial_number,
          status: "success",
        })
      } catch (itemError) {
        console.error(`[v0] Error processing contribution ${contribution.id}:`, itemError)
        matchResults.push({
          contribution_id: contribution.id,
          status: "error",
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        })
      }
    }

    const result = {
      success: true,
      message: `Auto-matched ${matchedCount} contributions with payouts`,
      matchedCount,
      totalProcessed: unmatchedContributions.length,
      results: matchResults,
      timestamp: now.toISOString(),
    }

    console.log("[v0] Auto-match complete:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error in auto-match payout-contribution:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
