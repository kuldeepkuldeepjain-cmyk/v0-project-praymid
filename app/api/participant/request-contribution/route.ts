import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email, participantId, amount } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })

    // Resolve participantId if not provided
    let pid = participantId
    if (!pid) {
      const rows = await sql`SELECT id FROM participants WHERE email = ${email} LIMIT 1`
      if (!rows[0]) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      pid = rows[0].id
    }

    // Duplicate check
    const existing = await sql`
      SELECT id FROM payment_submissions
      WHERE participant_email = ${email}
        AND status IN ('request_pending', 'pending', 'in_process', 'proof_submitted')
      LIMIT 1
    `
    if (existing[0]) return NextResponse.json({ success: false, duplicate: true, error: "Pending submission exists" })

    await sql`
      INSERT INTO payment_submissions (participant_id, participant_email, amount, payment_method, status)
      VALUES (${pid}, ${email}, ${amount || 100}, 'request', 'request_pending')
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
