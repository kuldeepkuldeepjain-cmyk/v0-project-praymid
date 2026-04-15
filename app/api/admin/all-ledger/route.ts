import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

// Helper — resolve participant name from a cached map (populated per-request)
function resolveName(map: Map<string, string>, email: string): string {
  return map.get(email?.toLowerCase()) ?? "Unknown"
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const sp              = request.nextUrl.searchParams
    const filterType      = sp.get("type")        || "all"
    const filterParticipant = sp.get("participant") || ""
    const sortOrder       = sp.get("order")       || "desc"
    const limit           = parseInt(sp.get("limit")  || "50", 10)
    const offset          = parseInt(sp.get("offset") || "0",  10)

    const supabase = await createClient()
    const entries: any[] = []

    // Build a participant name map in ONE query (no N+1)
    // We'll fetch all participants once and cache email → name
    const { data: allParticipants } = await supabase
      .from("participants")
      .select("email, full_name, username")

    const nameMap = new Map<string, string>()
    ;(allParticipants ?? []).forEach((p) => {
      nameMap.set((p.email ?? "").toLowerCase(), p.full_name || p.username || "Unknown")
    })

    // ── 1. transactions ────────────────────────────────────────────────
    if (filterType === "all" || filterType === "transaction") {
      const { data } = await supabase
        .from("transactions")
        .select("id, participant_id, participant_email, type, amount, status, created_at, description, balance_before, balance_after")

      ;(data ?? []).forEach((tx) => {
        const email = tx.participant_email || ""
        entries.push({
          id: `tx-${tx.id}`,
          participantEmail: email,
          participantName: resolveName(nameMap, email),
          type: "transaction",
          subType: tx.type || "transfer",
          amount: Number(tx.amount) || 0,
          status: tx.status || "completed",
          date: tx.created_at,
          description: tx.description || tx.type || "Transaction",
          balanceBefore: tx.balance_before,
          balanceAfter: tx.balance_after,
        })
      })
    }

    // ── 2. payment_submissions (contributions) ─────────────────────────
    if (filterType === "all" || filterType === "contribution") {
      const { data } = await supabase
        .from("payment_submissions")
        .select("id, participant_id, participant_email, amount, status, created_at, transaction_id, payment_method, admin_notes")

      ;(data ?? []).forEach((sub) => {
        const email = sub.participant_email || ""
        entries.push({
          id: `sub-${sub.id}`,
          participantEmail: email,
          participantName: resolveName(nameMap, email),
          type: "contribution",
          subType: "payment_submission",
          amount: Number(sub.amount) || 0,
          status: sub.status || "pending",
          date: sub.created_at,
          description: sub.admin_notes
            || (sub.transaction_id ? `Contribution — TxID: ${sub.transaction_id}` : null)
            || `Contribution via ${sub.payment_method || "crypto"}`,
        })
      })
    }

    // ── 3. payout_requests ─────────────────────────────────────────────
    if (filterType === "all" || filterType === "payout") {
      const { data } = await supabase
        .from("payout_requests")
        .select("id, participant_id, participant_email, amount, status, created_at, payout_method, admin_notes, transaction_hash")

      ;(data ?? []).forEach((p) => {
        const email = p.participant_email || ""
        entries.push({
          id: `payout-${p.id}`,
          participantEmail: email,
          participantName: resolveName(nameMap, email),
          type: "payout",
          subType: "payout_request",
          amount: -(Number(p.amount) || 0),
          status: p.status || "pending",
          date: p.created_at,
          description: p.admin_notes
            || (p.transaction_hash ? `Payout — TxHash: ${p.transaction_hash.slice(0, 12)}…` : null)
            || `Payout via ${p.payout_method || "BEP20"}`,
        })
      })
    }

    // ── 4. predictions ─────────────────────────────────────────────────
    if (filterType === "all" || filterType === "prediction") {
      const { data } = await supabase
        .from("predictions")
        .select("id, participant_id, participant_email, amount, status, created_at, crypto_pair, prediction_type, profit_loss, result")

      ;(data ?? []).forEach((pred) => {
        const email = pred.participant_email || ""
        entries.push({
          id: `pred-${pred.id}`,
          participantEmail: email,
          participantName: resolveName(nameMap, email),
          type: "prediction",
          subType: "prediction",
          amount: Number(pred.profit_loss ?? pred.amount) || 0,
          status: pred.status || "pending",
          date: pred.created_at,
          description: `${pred.prediction_type || "Binary"} on ${pred.crypto_pair || "crypto"}`
            + (pred.result ? ` — ${pred.result}` : ""),
        })
      })
    }

    // ── 5. topup_requests ─────────────────────────────────────────────
    if (filterType === "all" || filterType === "topup") {
      const { data } = await supabase
        .from("topup_requests")
        .select("id, participant_id, participant_email, amount, status, created_at, payment_method, transaction_id")

      ;(data ?? []).forEach((t) => {
        const email = t.participant_email || ""
        entries.push({
          id: `topup-${t.id}`,
          participantEmail: email,
          participantName: resolveName(nameMap, email),
          type: "topup",
          subType: "topup",
          amount: Number(t.amount) || 0,
          status: t.status || "pending",
          date: t.created_at,
          description: t.transaction_id
            ? `Top-up via ${t.payment_method || "crypto"} — TxID: ${t.transaction_id}`
            : `Top-up via ${t.payment_method || "crypto"}`,
        })
      })
    }

    // ── Participant filter ─────────────────────────────────────────────
    const filtered = filterParticipant
      ? (() => {
          const term = filterParticipant.toLowerCase()
          return entries.filter(
            (e) =>
              e.participantEmail.toLowerCase().includes(term) ||
              e.participantName.toLowerCase().includes(term)
          )
        })()
      : entries

    // ── Sort ───────────────────────────────────────────────────────────
    filtered.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortOrder === "desc" ? diff : -diff
    })

    // ── Paginate ───────────────────────────────────────────────────────
    const total = filtered.length
    const paged = filtered.slice(offset, offset + limit)

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
      { success: false, error: "Failed to fetch ledger", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
