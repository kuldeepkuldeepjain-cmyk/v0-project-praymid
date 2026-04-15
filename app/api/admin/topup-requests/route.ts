import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { requestId, action, adminEmail, adminNotes, rejectionReason } = body

    if (!requestId || !action || !adminEmail) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the topup request
    const { data: topupRecord, error: recordError } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (recordError || !topupRecord) {
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      )
    }

    if (topupRecord.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Request has already been processed" },
        { status: 400 }
      )
    }

    // Handle approval
    if (action === "approve") {
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .select("account_balance")
        .eq("id", topupRecord.participant_id)
        .single()

      if (participantError || !participant) {
        return NextResponse.json(
          { success: false, message: "Participant not found" },
          { status: 404 }
        )
      }

      const newBalance = (participant.account_balance || 0) + topupRecord.amount

      const { error: balanceError } = await supabase
        .from("participants")
        .update({
          account_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", topupRecord.participant_id)

      if (balanceError) {
        console.error("Balance update error:", balanceError)
        return NextResponse.json(
          { success: false, message: "Failed to credit wallet" },
          { status: 500 }
        )
      }

      const { error: updateError } = await supabase
        .from("topup_requests")
        .update({
          status: "completed",
          reviewed_at: new Date().toISOString(),
          reviewed_by_email: adminEmail,
          admin_notes: adminNotes || null,
        })
        .eq("id", requestId)

      if (updateError) {
        console.error("Request update error:", updateError)
        // Rollback balance
        await supabase
          .from("participants")
          .update({ account_balance: participant.account_balance })
          .eq("id", topupRecord.participant_id)

        return NextResponse.json(
          { success: false, message: "Failed to update request" },
          { status: 500 }
        )
      }

      await supabase.from("activity_logs").insert({
        actor_id: topupRecord.participant_id,
        actor_email: topupRecord.participant_email,
        action: "topup_approved",
        target_type: "wallet",
        details: `Admin ${adminEmail} approved $${topupRecord.amount} top-up. New balance: $${newBalance}`,
      })

      return NextResponse.json({
        success: true,
        message: "Top-up approved and wallet credited",
        newBalance,
      })
    }

    // Handle rejection
    if (action === "reject") {
      const { error: updateError } = await supabase
        .from("topup_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_email: adminEmail,
          rejection_reason: rejectionReason || "No reason provided",
          admin_notes: adminNotes || null,
        })
        .eq("id", requestId)

      if (updateError) {
        console.error("Request update error:", updateError)
        return NextResponse.json(
          { success: false, message: "Failed to update request" },
          { status: 500 }
        )
      }

      await supabase.from("activity_logs").insert({
        actor_id: topupRecord.participant_id,
        actor_email: topupRecord.participant_email,
        action: "topup_rejected",
        target_type: "wallet",
        details: `Admin ${adminEmail} rejected $${topupRecord.amount} top-up. Reason: ${rejectionReason || "Not specified"}`,
      })

      return NextResponse.json({
        success: true,
        message: "Top-up rejected",
      })
    }

    return NextResponse.json(
      { success: false, message: "Unknown error" },
      { status: 500 }
    )
  } catch (error) {
    console.error("Admin topup review API error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch all pending/completed topup requests
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: requests, error } = await supabase
      .from("topup_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch requests" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests,
    })
  } catch (error) {
    console.error("Admin topup GET API error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
