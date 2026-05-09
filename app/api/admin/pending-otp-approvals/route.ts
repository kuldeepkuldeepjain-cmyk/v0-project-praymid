import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, full_name, username, email,
              otp_verified, created_at
       FROM participants
       WHERE otp_verified = false AND whatsapp_otp IS NOT NULL
       ORDER BY created_at DESC`
    )

    return NextResponse.json({
      success: true,
      pending: rows,
      count: rows.length,
    })
  } catch (error: any) {
    console.error("[pending-otp-approvals] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed" }, { status: 500 })
  }
}
