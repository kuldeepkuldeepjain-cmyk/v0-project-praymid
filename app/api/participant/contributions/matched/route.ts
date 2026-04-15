import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

/**
 * GET /api/participant/contributions/matched?email=...
 *
 * Returns the current matched contribution (in_process) for a participant
 * along with the payout recipient details.
 *
 * Runs with the server/service-role client so it can read across
 * payout_requests + participants tables regardless of RLS policies.
 */
export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) {
      return NextResponse.json({ matched: false, error: "email required" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Find the most recent matched contribution (in_process OR proof_submitted)
    // proof_submitted means the participant uploaded proof and is awaiting admin approval
    const { data: contribution, error: contribErr } = await supabase
      .from("payment_submissions")
      .select("id, amount, status, created_at, matched_payout_id, participant_id")
      .eq("participant_email", email)
      .in("status", ["in_process", "proof_submitted"])
      .not("matched_payout_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (contribErr) {
      console.error("[matched-api] contribution fetch error:", contribErr.message)
      return NextResponse.json({ matched: false, error: contribErr.message }, { status: 500 })
    }

    if (!contribution) {
      // Also check for pending (unmatched) so the client knows which state to show
      const { data: pendingRow } = await supabase
        .from("payment_submissions")
        .select("id, created_at")
        .eq("participant_email", email)
        .in("status", ["pending", "request_pending"])
        .is("matched_payout_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        matched: false,
        pending: !!pendingRow,
        pendingCreatedAt: pendingRow?.created_at ?? null,
      })
    }

    // 2. Fetch payout request row — cross-table, needs service role
    const { data: payoutRow, error: payoutErr } = await supabase
      .from("payout_requests")
      .select("id, amount, status, wallet_address, participant_id, participant_email, serial_number")
      .eq("id", contribution.matched_payout_id)
      .maybeSingle()

    if (payoutErr) {
      console.error("[matched-api] payout fetch error:", payoutErr.message)
      return NextResponse.json({ matched: false, error: payoutErr.message }, { status: 500 })
    }

    if (!payoutRow) {
      console.error("[matched-api] payout row not found for id:", contribution.matched_payout_id)
      return NextResponse.json({ matched: false, error: "payout row not found" }, { status: 404 })
    }

    // 3. Fetch recipient participant details
    let recipient: any = null
    if (payoutRow.participant_id) {
      const { data: p } = await supabase
        .from("participants")
        .select("id, full_name, mobile_number, bep20_address, wallet_address, email")
        .eq("id", payoutRow.participant_id)
        .maybeSingle()
      recipient = p
    }

    // Fallback: if recipient not found by id, try by email
    if (!recipient && payoutRow.participant_email) {
      const { data: p } = await supabase
        .from("participants")
        .select("id, full_name, mobile_number, bep20_address, wallet_address, email")
        .eq("email", payoutRow.participant_email)
        .maybeSingle()
      recipient = p
    }

    return NextResponse.json({
      matched: true,
      contribution: {
        id: contribution.id,
        amount: contribution.amount,
        status: contribution.status,
        created_at: contribution.created_at,
      },
      payout: {
        id: payoutRow.id,
        amount: payoutRow.amount,
        status: payoutRow.status,
        wallet_address: payoutRow.wallet_address,
        serial_number: payoutRow.serial_number,
        participant_email: payoutRow.participant_email,
        participants: recipient,
      },
    })
  } catch (err: any) {
    console.error("[matched-api] unexpected error:", err)
    return NextResponse.json({ matched: false, error: String(err) }, { status: 500 })
  }
}
