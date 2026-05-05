import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { participantId } = await request.json()
    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }
    const db = getPool()!
    const res = await db.query("SELECT email FROM participants WHERE id = $1", [participantId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const email = res.rows[0].email

    // Delete related records first
    await db.query("DELETE FROM activity_logs WHERE actor_id = $1", [participantId])
    await db.query("DELETE FROM payment_submissions WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM payout_requests WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM predictions WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM transactions WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM invite_logs WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM topup_requests WHERE participant_id = $1", [participantId])
    await db.query("DELETE FROM mobile_verification_otps WHERE email = $1", [email])
    await db.query("DELETE FROM notifications WHERE user_email = $1", [email])
    await db.query("UPDATE wallet_pool SET assigned_to = NULL WHERE assigned_to = $1", [participantId])
    await db.query("DELETE FROM participants WHERE id = $1", [participantId])

    return NextResponse.json({ success: true, message: "Participant and all related data permanently deleted", participantId, email })
  } catch (error) {
    console.error("[v0] Error in delete participant API:", error)
    return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 })
  }
}
