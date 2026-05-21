import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const status = sp.get("status")
    const limit = sp.get("limit") ? Number(sp.get("limit")) : 100
    const offset = sp.get("offset") ? Number(sp.get("offset")) : 0
    const loadAll = sp.get("loadAll") === "true"

    const params: any[] = []
    let statusFilter = ""
    
    if (status) {
      params.push(status)
      statusFilter = ` AND pr.status = $${params.length}`
    }

    // Get total count
    const countRows = await query(
      `SELECT COUNT(*) as total FROM payout_requests pr WHERE 1=1 ${statusFilter}`,
      params
    )
    const totalCount = Number(countRows?.[0]?.total) || 0

    // Build query based on whether we're loading all or paginating
    let queryStr = `SELECT
        pr.id,
        pr.participant_email,
        pr.amount,
        pr.status,
        pr.payout_method,
        pr.wallet_address,
        pr.redirect_to_email,
        pr.created_at,
        pr.updated_at,
        p.full_name,
        p.username,
        p.phone,
        p.mobile_number,
        p.bep20_address,
        p.serial_number AS participant_serial,
        p.account_balance,
        p.contributed_amount
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE 1=1 ${statusFilter}
      ORDER BY pr.created_at DESC`

    if (!loadAll) {
      params.push(limit)
      const limitParam = `$${params.length}`
      params.push(offset)
      const offsetParam = `$${params.length}`
      queryStr += ` LIMIT ${limitParam} OFFSET ${offsetParam}`
    }

    const rows = await query(queryStr, params)

    return NextResponse.json({
      success: true,
      payouts: rows.map((r: any) => ({
        id: r.id,
        participant_email: r.participant_email,
        amount: Number(r.amount),
        status: r.status,
        serial_number: r.participant_serial,
        payout_method: r.payout_method,
        wallet_address: r.wallet_address,
        redirect_to_email: r.redirect_to_email,
        created_at: r.created_at,
        updated_at: r.updated_at,
        full_name: r.full_name || r.username || "Unknown",
        phone: r.phone || r.mobile_number || null,
        bep20_address: r.bep20_address || r.wallet_address || null,
        participant_serial: r.participant_serial,
        account_balance: Number(r.account_balance) || 0,
        contributed_amount: Number(r.contributed_amount) || 0,
      })),
      totalCount,
      limit: loadAll ? totalCount : limit,
      offset: loadAll ? 0 : offset,
      hasMore: loadAll ? false : offset + limit < totalCount,
    })
  } catch (err) {
    console.error("[all-payouts] GET error:", err)
    return NextResponse.json({ success: false, error: "Failed to fetch payout records" }, { status: 500 })
  }
}
