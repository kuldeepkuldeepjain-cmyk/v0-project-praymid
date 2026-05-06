import { NextRequest, NextResponse } from "next/server"
import { query as dbQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get("participantId")
    const email = searchParams.get("email")

    if (!participantId && !email) {
      return NextResponse.json({ success: false, error: "participantId or email required" }, { status: 400 })
    }

    const rows = participantId
      ? await dbQuery("SELECT id, email, full_name, otp_verified, otp_verified_at, whatsapp_otp FROM participants WHERE id = ?LIMIT 1", [participantId])
      : await dbQuery("SELECT id, email, full_name, otp_verified, otp_verified_at, whatsapp_otp FROM participants WHERE email = ?LIMIT 1", [email])

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const p = rows[0]

    return NextResponse.json({
      success: true,
      otp_verified: p.otp_verified === true,
      otp_verified_at: p.otp_verified_at || null,
      whatsapp_otp: p.whatsapp_otp || null,
      participant_id: p.id,
      email: p.email,
    })
  } catch (error: any) {
    console.error("[otp-status] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed" }, { status: 500 })
  }
}
