import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const sp = request.nextUrl.searchParams
    const participantId = sp.get("participantId")
    const filterType   = sp.get("type")    || "all"
    const sortOrder    = sp.get("order")   || "desc"
    const limit        = parseInt(sp.get("limit")  || "15", 10)
    const offset       = parseInt(sp.get("offset") || "0",  10)

    if (!participantId) {
      return NextResponse.json({ error: "participantId is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const entries: any[] = []

    // ── 1. transactions ────────────────────────────────────────────────
    if (filterType === "all" || filterType === "transaction") {
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, status, created_at, description, balance_before, balance_after")
        .eq("participant_id", participantId)

      ;(data ?? []).forEach((tx) =>
        entries.push({
          id: `tx-${tx.id}`,
          type: "transaction",
          subType: tx.type || "transfer",
          amount: Number(tx.amount) || 0,
          status: tx.status || "completed",
          date: tx.created_at,
          description: tx.description || tx.type || "Transaction",
          balanceBefore: tx.balance_before,
          balanceAfter: tx.balance_after,
        })
      )
    }

    // ── 2. payment_submissions (contributions) ─────────────────────────
    if (filterType === "all" || filterType === "contribution") {
      // Schema columns: id, participant_id, participant_email, amount, status,
      //   created_at, transaction_id, payment_method, admin_notes, status, screenshot_url
      const { data } = await supabase
        .from("payment_submissions")
        .select("id, amount, status, created_at, transaction_id, payment_method, admin_notes")
        .eq("participant_id", participantId)

      ;(data ?? []).forEach((sub) =>
        entries.push({
          id: `sub-${sub.id}`,
          type: "contribution",
          subType: "payment_submission",
          amount: Number(sub.amount) || 0,
          status: sub.status || "pending",
          date: sub.created_at,
          description: sub.admin_notes
            || (sub.transaction_id ? `Contribution — TxID: ${sub.transaction_id}` : null)
            || `Contribution via ${sub.payment_method || "crypto"}`,
        })
      )
    }

    // ── 3. payout_requests ─────────────────────────────────────────────
    if (filterType === "all" || filterType === "payout") {
      // Schema columns: id, participant_id, amount, status, created_at,
      //   payout_method, admin_notes, transaction_hash, wallet_address
      const { data } = await supabase
        .from("payout_requests")
        .select("id, amount, status, created_at, payout_method, admin_notes, transaction_hash")
        .eq("participant_id", participantId)

      ;(data ?? []).forEach((p) =>
        entries.push({
          id: `payout-${p.id}`,
          type: "payout",
          subType: "payout_request",
          amount: -(Number(p.amount) || 0),
          status: p.status || "pending",
          date: p.created_at,
          description: p.admin_notes
            || (p.transaction_hash ? `Payout — TxHash: ${p.transaction_hash.slice(0, 12)}…` : null)
            || `Payout via ${p.payout_method || "BEP20"}`,
        })
      )
    }

    // ── 4. predictions ─────────────────────────────────────────────────
    if (filterType === "all" || filterType === "prediction") {
      // Schema columns: id, participant_id, amount, status, created_at,
      //   crypto_pair, prediction_type, profit_loss, entry_price, target_price
      const { data } = await supabase
        .from("predictions")
        .select("id, amount, status, created_at, crypto_pair, prediction_type, profit_loss, result")
        .eq("participant_id", participantId)

      ;(data ?? []).forEach((pred) =>
        entries.push({
          id: `pred-${pred.id}`,
          type: "prediction",
          subType: "prediction",
          amount: Number(pred.profit_loss ?? pred.amount) || 0,
          status: pred.status || "pending",
          date: pred.created_at,
          description: `${pred.prediction_type || "Binary"} on ${pred.crypto_pair || "crypto"}`
            + (pred.result ? ` — ${pred.result}` : ""),
        })
      )
    }

    // ── 5. topup_requests ─────────────────────────────────────────────
    if (filterType === "all" || filterType === "topup") {
      // Schema columns: id, participant_id, amount, status, created_at,
      //   payment_method, transaction_id
      const { data } = await supabase
        .from("topup_requests")
        .select("id, amount, status, created_at, payment_method, transaction_id")
        .eq("participant_id", participantId)

      ;(data ?? []).forEach((t) =>
        entries.push({
          id: `topup-${t.id}`,
          type: "topup",
          subType: "topup",
          amount: Number(t.amount) || 0,
          status: t.status || "pending",
          date: t.created_at,
          description: t.transaction_id
            ? `Top-up via ${t.payment_method || "crypto"} — TxID: ${t.transaction_id}`
            : `Top-up via ${t.payment_method || "crypto"}`,
        })
      )
    }

    // ── Sort ───────────────────────────────────────────────────────────
    entries.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortOrder === "desc" ? diff : -diff
    })

    // ── Paginate ───────────────────────────────────────────────────────
    const total = entries.length
    const paged = entries.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paged,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch ledger", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
