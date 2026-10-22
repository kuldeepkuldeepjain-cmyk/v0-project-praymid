import { NextRequest, NextResponse } from "next/server"
import { query as dbQuery } from "@/lib/db"
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

    const entries: any[] = []

    const nameRows = await dbQuery(`SELECT email, full_name, username, mobile_number, serial_number FROM participants`)
    const nameMap = new Map<string, { name: string; mobile?: string; serial?: string }>()
    nameRows.forEach((p: any) => nameMap.set(
      (p.email || "").toLowerCase(),
      { name: p.full_name || p.username || "Unknown", mobile: p.mobile_number, serial: p.serial_number }
    ))
    const resolveName = (email: string) => nameMap.get(email?.toLowerCase())?.name ?? "Unknown"
    const resolveMobile = (email: string) => nameMap.get(email?.toLowerCase())?.mobile ?? null
    const resolveSerial = (email: string) => nameMap.get(email?.toLowerCase())?.serial ?? null

    if (filterType === "all" || filterType === "transaction") {
      const rows = await dbQuery(`SELECT id,participant_email,type,amount,status,created_at,description,balance_before,balance_after FROM transactions`).catch(() => [])
      rows.forEach((tx: any) => entries.push({ id:`tx-${tx.id}`, participantEmail:tx.participant_email||"", participantName:resolveName(tx.participant_email||""), participantMobile:resolveMobile(tx.participant_email||""), participantSerial:resolveSerial(tx.participant_email||""), type:"transaction", subType:tx.type||"transfer", amount:Number(tx.amount)||0, status:tx.status||"completed", date:tx.created_at, description:tx.description||tx.type||"Transaction", balanceBefore:tx.balance_before, balanceAfter:tx.balance_after }))
    }
    if (filterType === "all" || filterType === "contribution") {
      const rows = await dbQuery(`SELECT id,participant_email,amount,status,created_at,transaction_id,payment_method,admin_notes FROM payment_submissions`).catch(() => [])
      rows.forEach((sub: any) => entries.push({ id:`sub-${sub.id}`, participantEmail:sub.participant_email||"", participantName:resolveName(sub.participant_email||""), participantMobile:resolveMobile(sub.participant_email||""), participantSerial:resolveSerial(sub.participant_email||""), type:"contribution", subType:"payment_submission", amount:Number(sub.amount)||0, status:sub.status||"pending", date:sub.created_at, description:sub.admin_notes||(sub.transaction_id?`Contribution — TxID: ${sub.transaction_id}`:null)||`Contribution via ${sub.payment_method||"crypto"}` }))
    }
    if (filterType === "all" || filterType === "payout") {
      const rows = await dbQuery(`SELECT id,participant_email,amount,status,created_at,payout_method,admin_notes,transaction_hash FROM payout_requests`).catch(() => [])
      rows.forEach((p: any) => entries.push({ id:`payout-${p.id}`, participantEmail:p.participant_email||"", participantName:resolveName(p.participant_email||""), participantMobile:resolveMobile(p.participant_email||""), participantSerial:resolveSerial(p.participant_email||""), type:"payout", subType:"payout_request", amount:-(Number(p.amount)||0), status:p.status||"pending", date:p.created_at, description:p.admin_notes||(p.transaction_hash?`Payout — TxHash: ${p.transaction_hash.slice(0,12)}…`:null)||`Payout via ${p.payout_method||"BEP20"}` }))
    }
    if (filterType === "all" || filterType === "prediction") {
      const rows = await dbQuery(`SELECT id,participant_email,amount,status,created_at,crypto_pair,prediction_type,profit_loss,result FROM predictions`).catch(() => [])
      rows.forEach((pred: any) => entries.push({ id:`pred-${pred.id}`, participantEmail:pred.participant_email||"", participantName:resolveName(pred.participant_email||""), participantMobile:resolveMobile(pred.participant_email||""), participantSerial:resolveSerial(pred.participant_email||""), type:"prediction", subType:"prediction", amount:Number(pred.profit_loss??pred.amount)||0, status:pred.status||"pending", date:pred.created_at, description:`${pred.prediction_type||"Binary"} on ${pred.crypto_pair||"crypto"}`+(pred.result?` — ${pred.result}`:"") }))
    }
    if (filterType === "all" || filterType === "forex_trade") {
      const rows = await dbQuery(`SELECT id, participant_id, participant_email, pair, direction, lot_size, leverage, open_price, close_price, margin, final_pnl, final_pips, final_swap, close_reason, status, open_time, close_time FROM forex_trades WHERE status = 'closed' ORDER BY COALESCE(close_time, open_time) DESC LIMIT 1000`).catch(() => [])
      rows.forEach((trade: any) => {
        const pnl = Number(trade.final_pnl) || 0
        entries.push({
          id: `forex-${trade.id}`, participantEmail: trade.participant_email || "", participantName: resolveName(trade.participant_email || ""), participantMobile: resolveMobile(trade.participant_email || ""), participantSerial: resolveSerial(trade.participant_email || ""),
          type: "forex_trade", subType: pnl >= 0 ? "profit" : "loss", amount: pnl, status: "completed", date: trade.close_time || trade.open_time,
          description: `${trade.direction} ${trade.pair} ${pnl >= 0 ? "profit" : "loss"} — ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
          balanceBefore: null, balanceAfter: null,
          trade: { pair: trade.pair, direction: trade.direction, lotSize: Number(trade.lot_size) || 0, leverage: Number(trade.leverage) || 0, margin: Number(trade.margin) || 0, openPrice: Number(trade.open_price) || 0, closePrice: Number(trade.close_price) || 0, pips: Number(trade.final_pips) || 0, swap: Number(trade.final_swap) || 0, closeReason: trade.close_reason },
        })
      })
    }
    if (filterType === "all" || filterType === "topup") {
      const rows = await dbQuery(`SELECT id,participant_email,amount,status,created_at,payment_method,transaction_id FROM topup_requests`).catch(() => [])
      rows.forEach((t: any) => entries.push({ id:`topup-${t.id}`, participantEmail:t.participant_email||"", participantName:resolveName(t.participant_email||""), participantMobile:resolveMobile(t.participant_email||""), participantSerial:resolveSerial(t.participant_email||""), type:"topup", subType:"topup", amount:Number(t.amount)||0, status:t.status||"pending", date:t.created_at, description:t.transaction_id?`Top-up via ${t.payment_method||"crypto"} — TxID: ${t.transaction_id}`:`Top-up via ${t.payment_method||"crypto"}` }))
    }

    const filtered = filterParticipant
      ? entries.filter(e => e.participantEmail.toLowerCase().includes(filterParticipant.toLowerCase()) || e.participantName.toLowerCase().includes(filterParticipant.toLowerCase()))
      : entries

    filtered.sort((a, b) => { const d = new Date(b.date).getTime() - new Date(a.date).getTime(); return sortOrder === "desc" ? d : -d })

    const total = filtered.length
    const paged = filtered.slice(offset, offset + limit)

    return NextResponse.json({ success:true, data:paged, ledger:paged, pagination:{ total, limit, offset, totalPages:Math.ceil(total/limit), hasMore:offset+limit<total } })
  } catch {
    return NextResponse.json({ success:false, error:"Failed to fetch ledger" }, { status:500 })
  }
}
