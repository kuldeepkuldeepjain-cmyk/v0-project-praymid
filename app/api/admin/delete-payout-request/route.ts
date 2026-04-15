import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutRequestId } = await request.json()

    if (!payoutRequestId) {
      return NextResponse.json({ error: "Payout Request ID is required" }, { status: 400 })
    }

    console.log("[v0] Delete request for payout:", payoutRequestId)

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

    console.log("[v0] Creating admin Supabase client")
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    // Get payout request details first
    const { data: payoutRequest, error: fetchError } = await supabase
      .from("payout_requests")
      .select("id, serial_number, amount, participant_email, status")
      .eq("id", payoutRequestId)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error fetching payout request:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch payout request", details: fetchError.message },
        { status: 400 }
      )
    }

    if (!payoutRequest) {
      console.log("[v0] Payout request not found:", payoutRequestId)
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }

    console.log("[v0] Found payout request to delete - Serial:", payoutRequest.serial_number)

    // STEP 1: Unlink this payout from any matched payment submissions
    console.log("[v0] Step 1: Unlinking payout from any matched payment submissions")
    const { error: unlinkError, count: unlinkCount } = await supabase
      .from("payment_submissions")
      .update({ matched_payout_id: null, matched_at: null })
      .eq("matched_payout_id", payoutRequestId)

    if (unlinkError) {
      console.warn("[v0] Warning unlinking contribution:", unlinkError)
      // Continue anyway - this shouldn't block deletion
    } else {
      console.log(`[v0] Unlinked ${unlinkCount || 0} payment submissions from this payout`)
    }

    // STEP 2: Delete the payout request
    console.log("[v0] Step 2: Deleting payout request:", payoutRequestId)
    const { error: deleteError, count: deleteCount } = await supabase
      .from("payout_requests")
      .delete()
      .eq("id", payoutRequestId)

    if (deleteError) {
      console.error("[v0] Error deleting payout request:", deleteError)
      return NextResponse.json(
        {
          error: "Failed to delete payout request",
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    console.log(`[v0] Successfully deleted payout request ${payoutRequestId}`)

    return NextResponse.json(
      {
        success: true,
        message: "Payout request has been permanently deleted",
        payoutRequestId,
        serialNumber: payoutRequest.serial_number,
        amount: payoutRequest.amount,
        unlinkedSubmissions: unlinkCount || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error in delete payout request API:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Full error details:", errorMessage)

    return NextResponse.json(
      {
        error: "Failed to delete payout request",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
