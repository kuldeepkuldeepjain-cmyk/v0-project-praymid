import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId, action } = await request.json()
    // action: "activate" | "deactivate" | "suspend"

    if (!participantId) {
      return NextResponse.json({ success: false, error: "Participant ID required" }, { status: 400 })
    }

    const validActions = ["activate", "deactivate", "suspend"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Check participant exists
    const rows = await query(
      "SELECT id, email, full_name, username, status, is_active FROM participants WHERE id = $1 LIMIT 1",
      [participantId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant = rows[0] as any

    const newStatus = action === "activate" ? "active" : action === "deactivate" ? "pending" : "suspended"
    const newIsActive = action === "activate"

    await execute(
      "UPDATE participants SET status = $1, is_active = $2, updated_at = NOW() WHERE id = $3",
      [newStatus, newIsActive, participantId]
    )

    // Log audit (best-effort)
    await execute(
      "INSERT INTO audit_logs (action, description, admin_email) VALUES ($1, $2, $3)",
      [
        action.toUpperCase() + "_PARTICIPANT",
        `Admin ${auth.email} ${action}d participant ${participant.email}`,
        auth.email,
      ]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Participant ${action}d successfully`,
      participantId,
      email: participant.email,
      newStatus,
      newIsActive,
    })
  } catch (error: any) {
    console.error("[activate-participant] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update participant" },
      { status: 500 }
    )
  }
}
