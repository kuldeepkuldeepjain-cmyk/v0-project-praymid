import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const sp = request.nextUrl.searchParams
    const filterType = sp.get("type") || "all"
    const filterParticipant = sp.get("participant") || ""
    const sortOrder = sp.get("order") || "desc"
    const limit = parseInt(sp.get("limit") || "50", 10)
    const offset = parseInt(sp.get("offset") || "0", 10)

    const allParticipants = await sql`SELECT email, full_name, username FROM participants`
    const nameMap = new Map<string, string>()
    allParticipants.forEach((p: any) =>
      nameMap.set((p.email ?? "").toLowerCase(), p.full_name || p.username || "Unknown"),
    )
    const name = (email: string) => nameMap.get(email?.toLowerCase()) ?? "Unknown"

    const entries: any[] = []

    if (filterType === "all" || filterType === "transaction") {
      const rows = await sql`SELECT id, participant_email, type, amount, status, created_at, description, balance_before, balance_after FROM transactions`
      rows.forEach((tx: any) =>
        entries.push({
          id: `tx-${tx.id}`, participantEmail: tx.participant_email, participantName: name(tx.participant_email),
          type: "transaction", subType: tx.type || "transfer", amount: Number(tx.amount) || 0,
          status: tx.status || "completed", date: tx.created_at,
          description: tx.description || tx.type || "Transaction",
          balanceBefore: tx.balance_before, balanceAfter: tx.balance_after,
        }),
      )
    }

    if (filterType === "all" || filterType === "contribution") {
      const rows = await sql`SELECT id, participant_email, amount, status, created_at, transaction_id, payment_method, admin_notes FROM payment_submissions`
      rows.forEach((sub: any) =>
        entries.push({
          id: `sub-${sub.id}`, participantEmail: sub.participant_email, participantName: name(sub.participant_email),
          type: "contribution", subType: "payment_submission", amount: Number(sub.amount) || 0,
          status: sub.status || "pending", date: sub.created_at,
          description: sub.admin_notes || (sub.transaction_id ? `Contribution — TxID: ${sub.transaction_id}` : null) || `Contribution via ${sub.payment_method || "crypto"}`,
        }),
      )
    }

    if (filterType === "all" || filterType === "payout") {
      const rows = await sql`SELECT id, participant_email, amount, status, created_at, payout_method, admin_notes, transaction_hash FROM payout_requests`
      rows.forEach((p: any) =>
        entries.push({
          id: `payout-${p.id}`, participantEmail: p.participant_email, participantName: name(p.participant_email),
          type: "payout", subType: "payout_request", amount: -(Number(p.amount) || 0),
          status: p.status || "pending", date: p.created_at,
          description: p.admin_notes || (p.transaction_hash ? `Payout — TxHash: ${p.transaction_hash.slice(0, 12)}…` : null) || `Payout via ${p.payout_method || "BEP20"}`,
        }),
      )
    }

    if (filterType === "all" || filterType === "prediction") {
      const rows = await sql`SELECT id, participant_email, amount, status, created_at, crypto_pair, prediction_type, profit_loss, result FROM predictions`
      rows.forEach((pred: any) =>
        entries.push({
          id: `pred-${pred.id}`, participantEmail: pred.participant_email, participantName: name(pred.participant_email),
          type: "prediction", subType: "prediction", amount: Number(pred.profit_loss ?? pred.amount) || 0,
          status: pred.status || "pending", date: pred.created_at,
          description: `${pred.prediction_type || "Binary"} on ${pred.crypto_pair || "crypto"}` + (pred.result ? ` — ${pred.result}` : ""),
        }),
      )
    }

    if (filterType === "all" || filterType === "topup") {
      const rows = await sql`SELECT id, participant_email, amount, status, created_at, payment_method, transaction_id FROM topup_requests`
      rows.forEach((t: any) =>
        entries.push({
          id: `topup-${t.id}`, participantEmail: t.participant_email, participantName: name(t.participant_email),
          type: "topup", subType: "topup", amount: Number(t.amount) || 0,
          status: t.status || "pending", date: t.created_at,
          description: t.transaction_id ? `Top-up via ${t.payment_method || "crypto"} — TxID: ${t.transaction_id}` : `Top-up via ${t.payment_method || "crypto"}`,
        }),
      )
    }

    const filtered = filterParticipant
      ? entries.filter((e) => {
          const term = filterParticipant.toLowerCase()
          return e.participantEmail?.toLowerCase().includes(term) || e.participantName?.toLowerCase().includes(term)
        })
      : entries

    filtered.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortOrder === "desc" ? diff : -diff
    })

    const total = filtered.length
    const paged = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paged,
      pagination: { total, limit, offset, totalPages: Math.ceil(total / limit), hasMore: offset + limit < total },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
