import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: "Participant ID is required" },
        { status: 400 }
      )
    }

    // Delete the participant record (pending OTP approval)
    const result = await query(
      `DELETE FROM participants WHERE id = $1 AND (otp_verified = false OR otp_verified IS NULL)`,
      [participantId]
    )

    // Log the deletion
    await query(
      `INSERT INTO activity_logs(actor_email, action, details, target_type)
       VALUES($1, 'otp_approval_deleted', $2, 'otp_approval')`,
      [auth.email, `Deleted pending OTP approval for participant ID: ${participantId}`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Pending OTP approval deleted successfully",
    })
  } catch (error: any) {
    console.error("[delete-otp-approval] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete" }, { status: 500 })
  }
}
