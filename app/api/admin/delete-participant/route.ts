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
    
    // Get participant email first
    const PROTECTED_EMAIL = "kuldeepkuldeepjain@gmail.com"

    const res = await db.query("SELECT email FROM participants WHERE id = $1", [participantId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const email = res.rows[0].email

    // Block deletion of protected account
    if (email.toLowerCase() === PROTECTED_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "This participant account is protected and cannot be deleted." }, { status: 403 })
    }

    await db.query("UPDATE payment_submissions SET is_deleted = true WHERE participant_id = $1", [participantId]).catch(() => {})
    await db.query("UPDATE payout_requests SET is_deleted = true WHERE participant_id = $1", [participantId]).catch(() => {})
    await db.query("UPDATE predictions SET is_deleted = true WHERE participant_id = $1", [participantId]).catch(() => {})
    await db.query("UPDATE contribution_ledger SET is_deleted = true WHERE participant_id = $1", [participantId]).catch(() => {})
    await db.query("UPDATE participants SET is_deleted = true, deleted_at = NOW() WHERE id = $1", [participantId])
    await db.query("UPDATE wallet_pool SET assigned_to = NULL WHERE assigned_to = $1", [participantId]).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Participant and all related data marked as deleted from database",
      participantId,
      email,
      deleted_at: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete participant", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
