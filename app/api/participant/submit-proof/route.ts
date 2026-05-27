import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { submissionId, transactionId, screenshotUrl, adminNotes } = await req.json()
    if (!submissionId || !transactionId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    await sql`
      UPDATE payment_submissions
      SET transaction_id = ${transactionId},
          screenshot_url = ${screenshotUrl || null},
          admin_notes = ${adminNotes || null},
          status = 'proof_submitted',
          updated_at = NOW()
      WHERE id = ${submissionId}
        AND status IN ('in_process', 'proof_submitted')
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
