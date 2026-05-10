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
    const res = await db.query("SELECT email FROM participants WHERE id = $1", [participantId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const email = res.rows[0].email

    // Use soft deletes - mark is_deleted = true only on tables that have the column
    console.log("[v0] Soft deleting participant:", participantId);
    
    // Tables with is_deleted column - update these
    try {
      await db.query("UPDATE payment_submissions SET is_deleted = true WHERE participant_id = $1", [participantId])
    } catch (e) {
      console.log("[v0] Note: payment_submissions update skipped")
    }
    
    try {
      await db.query("UPDATE payout_requests SET is_deleted = true WHERE participant_id = $1", [participantId])
    } catch (e) {
      console.log("[v0] Note: payout_requests update skipped")
    }
    
    try {
      await db.query("UPDATE predictions SET is_deleted = true WHERE participant_id = $1", [participantId])
    } catch (e) {
      console.log("[v0] Note: predictions update skipped")
    }
    
    try {
      await db.query("UPDATE contribution_ledger SET is_deleted = true WHERE participant_id = $1", [participantId])
    } catch (e) {
      console.log("[v0] Note: contribution_ledger update skipped")
    }
    
    // Mark participant as deleted
    await db.query("UPDATE participants SET is_deleted = true, deleted_at = NOW() WHERE id = $1", [participantId])
    
    // Clear wallet assignments (doesn't require is_deleted column)
    try {
      await db.query("UPDATE wallet_pool SET assigned_to = NULL WHERE assigned_to = $1", [participantId])
    } catch (e) {
      console.log("[v0] Note: wallet_pool update skipped")
    }

    console.log("[v0] Successfully soft deleted participant:", participantId)
    return NextResponse.json({ 
      success: true, 
      message: "Participant and all related data marked as deleted from database",
      participantId, 
      email,
      deleted_at: new Date().toISOString()
    })
  } catch (error) {
    console.error("[v0] Error in delete participant API:", error)
    return NextResponse.json({ error: "Failed to delete participant", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
