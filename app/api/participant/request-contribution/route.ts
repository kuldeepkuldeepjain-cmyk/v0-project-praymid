import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email, participantId, amount } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })

    // Resolve participantId if not provided
    let pid = participantId
    if (!pid) {
      const rows = await query(`SELECT id FROM participants WHERE email = $1 LIMIT 1`, [email])
      if (!rows?.[0]) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      pid = rows[0].id
    }

    // Duplicate check
    const existing = await query(
      `SELECT id FROM payment_submissions
       WHERE participant_email = $1
         AND status = ANY($2::text[])
       LIMIT 1`,
      [email, ['request_pending', 'pending', 'in_process', 'proof_submitted']]
    )
    if (existing?.[0]) return NextResponse.json({ success: false, duplicate: true, error: "Pending submission exists" })

    await execute(
      `INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [pid, email, amount || 100, 'request', 'request_pending']
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
