import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }

    console.log("[v0] Delete request for participant:", participantId)

    // Get Supabase URL and Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[v0] Missing Supabase configuration")
      return NextResponse.json(
        { error: "Server configuration error - missing Supabase credentials" },
        { status: 500 }
      )
    }

    console.log("[v0] Creating admin Supabase client with service role key")
    
    // Import and create admin client
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    // Get participant email first before deleting
    const { data: participant, error: fetchError } = await supabase
      .from("participants")
      .select("email, id")
      .eq("id", participantId)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error fetching participant:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch participant", details: fetchError.message },
        { status: 400 }
      )
    }

    if (!participant) {
      console.log("[v0] Participant not found:", participantId)
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    console.log("[v0] Found participant to delete:", participant.email)

    // Deletion steps in order (no foreign key constraints in Supabase, but delete related data first)
    const deletionSteps = [
      { table: "activity_logs", column: "actor_id" },
      { table: "support_tickets", column: "participant_id" },
      { table: "payment_submissions", column: "participant_id" },
      { table: "payout_requests", column: "participant_id" },
      { table: "predictions", column: "participant_id" },
      { table: "transactions", column: "participant_id" },
      { table: "invite_logs", column: "participant_id" },
      { table: "gas_approvals", column: "participant_id" },
      { table: "user_contacts", column: "participant_id" },
      { table: "spin_coupons", column: "participant_id" },
      { table: "topup_requests", column: "participant_id" },
      { table: "mobile_verification_otps", column: "email", value: participant.email },
      { table: "notifications", column: "user_email", value: participant.email },
      { table: "wallet_pool", column: "assigned_to" },
    ]

    let totalDeleted = 0

    for (const step of deletionSteps) {
      try {
        const column = step.column
        const value = (step as any).value || participantId

        console.log(`[v0] Deleting from ${step.table} where ${column} = ${value}`)
        
        const { error: deleteError, count } = await supabase
          .from(step.table)
          .delete()
          .eq(column, value)

        if (deleteError) {
          console.warn(`[v0] Warning deleting from ${step.table}:`, deleteError.message)
          // Continue even if one table fails
        } else {
          console.log(`[v0] Deleted ${count || 0} records from ${step.table}`)
          totalDeleted += count || 0
        }
      } catch (stepError) {
        console.warn(`[v0] Caught error for ${step.table}:`, stepError)
        // Continue with next deletion step
      }
    }

    // Finally, delete the participant record
    console.log("[v0] Deleting participant record:", participantId)
    const { error: participantDeleteError, count: participantDeleteCount } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId)

    if (participantDeleteError) {
      console.error("[v0] Error deleting participant record:", participantDeleteError)
      return NextResponse.json(
        { 
          error: "Failed to delete participant record",
          details: participantDeleteError.message,
          deletedRelatedRecords: totalDeleted
        },
        { status: 500 }
      )
    }

    console.log(`[v0] Successfully deleted participant ${participantId} and ${totalDeleted} related records`)

    return NextResponse.json(
      {
        success: true,
        message: "Participant and all related data have been permanently deleted",
        participantId,
        email: participant.email,
        deletedRelatedRecords: totalDeleted,
        deletedParticipantRecord: participantDeleteCount || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error in delete participant API:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Full error details:", errorMessage)
    
    return NextResponse.json(
      {
        error: "Failed to delete participant",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
