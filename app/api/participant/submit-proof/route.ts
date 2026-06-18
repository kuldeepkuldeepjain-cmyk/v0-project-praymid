import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { submissionId, transactionId, screenshotUrl, adminNotes } = await req.json()
    if (!submissionId || !transactionId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    await execute(
      `UPDATE payment_submissions
       SET transaction_id = $1, screenshot_url = $2, admin_notes = $3, status = 'proof_submitted', updated_at = NOW()
       WHERE id = $4 AND status = ANY($5::text[])`,
      [transactionId, screenshotUrl || null, adminNotes || null, submissionId, ['in_process', 'proof_submitted']]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
