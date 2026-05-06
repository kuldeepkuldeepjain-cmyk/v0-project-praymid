import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET() {
  try {
    const db = getPool()!
    const res = await db.query("SELECT * FROM topup_requests ORDER BY created_at DESC")
    return NextResponse.json({ success: true, requests: res.rows })
  } catch (error) {
    console.error("Admin topup GET API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response
  try {
    const { requestId, action, adminEmail, adminNotes, rejectionReason } = await req.json()
    if (!requestId || !action || !adminEmail) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
    }
    const db = getPool()!
    const topupRes = await db.query("SELECT * FROM topup_requests WHERE id = $1", [requestId])
    if (!topupRes.rows.length) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 })
    }
    const topup = topupRes[0]
    if (topup.status !== "pending") {
      return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 })
    }

    if (action === "approve") {
      const pRes = await db.query("SELECT account_balance FROM participants WHERE id = $1", [topup.participant_id])
      if (!pRes.rows.length) return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 })
      const newBalance = Number(pRes[0].account_balance || 0) + Number(topup.amount)
      await db.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, topup.participant_id])
      await db.query(
        "UPDATE topup_requests SET status = 'completed', reviewed_at = NOW(), reviewed_by = $1, admin_notes = ?WHERE id = $3",
        [adminEmail, adminNotes || null, requestId]
      )
      await db.query(
        "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
        [topup.participant_id, topup.participant_email, "topup_approved", "wallet", `Admin ${adminEmail} approved $${topup.amount} top-up`]
      )
      return NextResponse.json({ success: true, message: "Top-up approved and wallet credited", newBalance })
    }

    await db.query(
      "UPDATE topup_requests SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, admin_notes = ?WHERE id = $3",
      [adminEmail, rejectionReason || adminNotes || null, requestId]
    )
    await db.query(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      [topup.participant_id, topup.participant_email, "topup_rejected", "wallet", `Admin ${adminEmail} rejected $${topup.amount} top-up`]
    )
    return NextResponse.json({ success: true, message: "Top-up rejected" })
  } catch (error) {
    console.error("Admin topup POST API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
