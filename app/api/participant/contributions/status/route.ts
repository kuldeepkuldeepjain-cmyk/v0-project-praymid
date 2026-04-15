import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the most recent contribution with "in_process" status (matched by automatch or admin)
    const { data: contribution, error: contribError } = await supabase
      .from("payment_submissions")
      .select("id, amount, status, created_at, matched_at, matched_payout_id, participant_email")
      .eq("participant_email", email)
      .eq("status", "in_process")
      .not("matched_payout_id", "is", null)
      .order("matched_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (contribError) {
      return NextResponse.json({ matched: false, error: contribError.message }, { status: 500 })
    }

    if (!contribution) {
      return NextResponse.json({ matched: false })
    }

    // Fetch the matched payout details
    const { data: payout, error: payoutError } = await supabase
      .from("payout_requests")
      .select(
        `id, participant_email, amount, payout_method, status, created_at,
        participant:participants(full_name, username)`
      )
      .eq("id", contribution.matched_payout_id)
      .maybeSingle()

    if (payoutError || !payout) {
      return NextResponse.json({ matched: false, error: "Payout not found" }, { status: 500 })
    }

    return NextResponse.json({
      matched: true,
      contribution: {
        id: contribution.id,
        amount: contribution.amount,
        status: contribution.status,
        created_at: contribution.created_at,
        matched_at: contribution.matched_at,
      },
      payout: {
        id: payout.id,
        participant_email: payout.participant_email,
        participant_name:
          (payout.participant as any)?.full_name ||
          (payout.participant as any)?.username ||
          "Unknown",
        amount: payout.amount,
        payout_method: payout.payout_method,
        status: payout.status,
      },
    })
  } catch (error) {
    console.error("Contributions status API error:", error)
    return NextResponse.json({ error: "Internal server error", matched: false }, { status: 500 })
  }
}
