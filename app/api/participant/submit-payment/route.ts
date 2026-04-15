import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { scheduleContributionAutoMatch } from "@/lib/contribution-scheduler"
import { requireParticipantSession } from "@/lib/auth-middleware"

export type PaymentSubmission = {
  id: string
  participantEmail: string
  participantWallet: string
  participantName?: string
  amount: number
  paymentMethod: "crypto" | "bank"
  screenshotData: string
  transactionHash?: string
  status: "pending" | "confirmed" | "rejected"
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  rejectionReason?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const formData = await request.json()
    const { email, wallet, paymentMethod, screenshot, transactionHash, bep20Address } = formData

    console.log("[v0] Validating required fields...")
    if (!email || !paymentMethod || !screenshot || !transactionHash) {
      console.error("[v0] Missing required fields:", { email: !!email, paymentMethod: !!paymentMethod, screenshot: !!screenshot, transactionHash: !!transactionHash })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    console.log("[v0] Checking for duplicate transaction hash...")
    // Check if transaction hash already exists (duplicate prevention)
    const { data: existingSubmission, error: checkError } = await supabase
      .from("payment_submissions")
      .select("id, status")
      .eq("transaction_id", transactionHash)
      .maybeSingle()

    if (checkError) {
      console.warn("[v0] Error checking for duplicate:", checkError)
    }

    if (existingSubmission) {
      console.warn("[v0] Duplicate transaction hash found:", transactionHash)
      return NextResponse.json(
        {
          error: "Transaction hash already submitted",
          message: "This transaction ID has already been submitted. Please use a different transaction hash.",
          existingSubmissionId: existingSubmission.id,
          existingStatus: existingSubmission.status,
        },
        { status: 409 }
      )
    }

    console.log("[v0] Fetching participant info for email:", email)
    // Get participant info
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, username")
      .eq("email", email)
      .maybeSingle()

    if (participantError) {
      console.error("[v0] Error fetching participant:", participantError)
    }

    if (!participant) {
      console.warn("[v0] Participant not found for email:", email)
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    console.log("[v0] Creating payment submission...")
    // Handle screenshot data - check if it's already a string (base64) or a File object
    let screenshotData: string
    if (typeof screenshot === "string") {
      // Already base64 string
      screenshotData = screenshot
    } else {
      // It's a File object, convert to text
      screenshotData = await screenshot.text()
    }

    const { data: submission, error } = await supabase
      .from("payment_submissions")
      .insert({
        participant_id: participant.id,
        participant_email: email,
        amount: 100,
        payment_method: paymentMethod || "USDT_BEP20",
        screenshot_url: screenshotData,
        transaction_id: transactionHash,
        status: "pending",
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error("[v0] Failed to save payment submission:", error)
      
      // Handle unique constraint violation for transaction_id
      if (error.code === "23505" || error.message.includes("unique") || error.message.includes("duplicate")) {
        return NextResponse.json(
          {
            error: "Duplicate transaction hash",
            message: "This transaction hash has already been submitted. Please use a different transaction.",
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json({ error: "Failed to submit payment", details: error.message }, { status: 500 })
    }

    if (!submission) {
      console.error("[v0] Submission was not returned from database")
      return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })
    }

    console.log("[v0] Payment submission created:", submission.id)

    if (bep20Address) {
      console.log("[v0] Updating BEP20 address for participant:", email)
      await supabase
        .from("participants")
        .update({
          bep20_address: bep20Address,
        })
        .eq("email", email)

      console.log("[v0] BEP20 address saved for participant:", email)
    }

    console.log("[v0] Creating activity log...")
    await supabase.from("activity_logs").insert({
      action: "payment_submitted",
      actor_id: participant.id,
      actor_email: email,
      target_type: "payment",
      details: `Payment submission $${submission.amount} via ${paymentMethod} - TxHash: ${transactionHash} - ID: ${submission.id}`,
    })

    // Schedule auto-match for 30 minutes after submission
    console.log("[v0] Scheduling auto-match for contribution:", submission.id)
    const scheduleResult = await scheduleContributionAutoMatch(submission.id, email, 1800)
    if (scheduleResult.success) {
      console.log("[v0] Auto-match scheduled successfully:", scheduleResult.messageId)
    } else {
      console.warn("[v0] Failed to schedule auto-match (manual match still available):", scheduleResult.error)
    }

    console.log("[v0] Payment submission completed successfully:", submission.id)

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: "Payment proof submitted successfully",
    })
  } catch (error) {
    console.error("[v0] Payment submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit payment", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: submissions, error } = await supabase
      .from("payment_submissions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Failed to fetch submissions:", error)

      if (error.code === "42P01") {
        console.log("[v0] payment_submissions table doesn't exist yet, returning empty array")
        return NextResponse.json({
          submissions: [],
          total: 0,
          pending: 0,
          confirmed: 0,
          rejected: 0,
        })
      }

      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
    }

    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      participantEmail: s.participant_email,
      participantId: s.participant_id,
      amount: s.amount,
      paymentMethod: s.payment_method,
      screenshotUrl: s.screenshot_url,
      transactionId: s.transaction_id,
      status: s.status,
      submittedAt: s.created_at,
      reviewedAt: s.reviewed_at,
      reviewedBy: s.reviewed_by,
      rejectionReason: s.rejection_reason,
      matchedPayoutId: s.matched_payout_id,
    }))

    console.log("[v0] Fetched payment submissions:", formattedSubmissions.length)

    return NextResponse.json({
      submissions: formattedSubmissions,
      total: formattedSubmissions.length,
      pending: formattedSubmissions.filter((s) => s.status === "pending").length,
      confirmed: formattedSubmissions.filter((s) => s.status === "confirmed").length,
      rejected: formattedSubmissions.filter((s) => s.status === "rejected").length,
    })
  } catch (error) {
    console.error("[v0] Error fetching submissions:", error)
    return NextResponse.json(
      {
        submissions: [],
        total: 0,
        pending: 0,
        confirmed: 0,
        rejected: 0,
      },
      { status: 200 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { submissionId, status, reviewedBy, rejectionReason } = await request.json()
    const supabase = await createClient()

    const { data: submission, error: updateError } = await supabase
      .from("payment_submissions")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
        rejection_reason: rejectionReason || null,
      })
      .eq("id", submissionId)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Failed to update submission:", updateError)
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (status === "confirmed") {
      const { data: participant } = await supabase
        .from("participants")
        .select("id, username, email, account_balance, total_earnings, wallet_address")
        .eq("email", submission.participant_email)
        .single()

      const newAccountBalance = Number(participant?.account_balance || 0) + 200
      const newTotalEarnings = Number(participant?.total_earnings || 0) + 200

      const { error: participantError } = await supabase
        .from("participants")
        .update({
          status: "active",
          is_active: true,
          account_balance: newAccountBalance,
          total_earnings: newTotalEarnings,
          activation_date: new Date().toISOString(),
        })
        .eq("email", submission.participant_email)

      if (participantError) {
        console.error("[v0] Failed to update participant status:", participantError)
      } else {
        console.log(
          `[v0] Participant activated with rewards: ${submission.participant_email}, +$200 account balance`,
        )
      }

      if (participant?.wallet_address) {
        try {
          const { error: poolError } = await supabase.from("wallet_pool").insert({
            assigned_to: participant?.id,
            wallet_address: participant?.wallet_address,
            network: "BEP20",
            balance: 100,
            status: "active",
          })

          if (poolError) {
            // Check if already exists or table doesn't exist
            if (poolError.code === "42P01") {
              console.log("[v0] wallet_pool table does not exist yet, skipping pool insertion")
            } else {
              const { data: existingWallet } = await supabase
                .from("wallet_pool")
                .select("id")
                .eq("participant_id", participant?.id)
                .single()

              if (existingWallet) {
                console.log("[v0] Wallet already in pool:", participant?.email)
              } else {
                console.error("[v0] Failed to add wallet to pool:", poolError)
              }
            }
          } else {
            console.log("[v0] Added participant wallet to pool:", participant?.email)
          }
        } catch (poolErr) {
          console.log("[v0] Wallet pool operation skipped (table may not exist):", poolErr)
        }
      }
    }

    try {
      await supabase.from("activity_logs").insert({
        action: status === "confirmed" ? "approve_payment" : "reject_payment",
        actor_id: "admin",
        actor_email: reviewedBy || "admin@system.com",
        target_type: "payment",
        details: `Payment ${status} for ${submission.participant_email} - $${submission.amount} (Submission ID: ${submissionId})${
          rejectionReason ? ` (Reason: ${rejectionReason})` : ""
        }`,
      })
    } catch (logErr) {
      console.log("[v0] Activity log insertion skipped:", logErr)
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        participantId: submission.participant_id,
        participantEmail: submission.participant_email,
        amount: submission.amount,
        status: submission.status,
        createdAt: submission.created_at,
      },
    })
  } catch (error) {
    console.error("[v0] Error updating submission:", error)
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}
