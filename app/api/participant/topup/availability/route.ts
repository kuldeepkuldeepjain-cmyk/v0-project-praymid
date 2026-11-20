import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const [participant] = await query<{ restart_required: boolean; tier_used: boolean; restart_pending: boolean }>(
      `SELECT (p.account_type = 'funded' AND p.funded_breach_status = 'breached') AS restart_required,
          EXISTS (SELECT 1 FROM topup_requests t WHERE t.participant_id = p.id AND t.payment_method = 'funded_tier') AS tier_used,
          EXISTS (SELECT 1 FROM topup_requests t WHERE t.participant_id = p.id AND t.payment_method = 'funded_restart'
            AND LOWER(t.status) IN ('pending', 'pending_collection', 'processing')
            AND (p.funded_breach_at IS NULL OR t.created_at >= p.funded_breach_at)) AS restart_pending
       FROM participants p WHERE p.id = $1`,
      [auth.participantId],
    )

    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      fundedRestartRequired: participant.restart_required,
      fundedTierAvailable: participant.restart_required ? !participant.restart_pending : !participant.tier_used,
    })
  } catch (error) {
    console.error("Top-up availability check failed:", error)
    return NextResponse.json({ success: false, message: "Unable to check funding options" }, { status: 500 })
  }
}
