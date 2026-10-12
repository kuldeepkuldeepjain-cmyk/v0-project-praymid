import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { execute, queryOne } from "@/lib/db"
import { getParticipantSessionFromReq } from "@/lib/session"

async function ensurePinColumn() {
  await execute("ALTER TABLE participants ADD COLUMN IF NOT EXISTS pin_hash TEXT")
}

export async function GET(request: NextRequest) {
  try {
    const session = await getParticipantSessionFromReq(request)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    await ensurePinColumn()
    const participant = await queryOne<{ pin_hash: string | null }>("SELECT pin_hash FROM participants WHERE id = $1 LIMIT 1", [session.participantId])
    return NextResponse.json({ success: true, pinConfigured: Boolean(participant?.pin_hash) })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to check PIN status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getParticipantSessionFromReq(request)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const body = await request.json()
    const pin = String(body?.pin || "")
    const confirmation = String(body?.confirmation || "")
    if (!/^\d{4,6}$/.test(pin)) return NextResponse.json({ success: false, error: "PIN must contain 4 to 6 digits" }, { status: 400 })
    if (pin !== confirmation) return NextResponse.json({ success: false, error: "PINs do not match" }, { status: 400 })
    await ensurePinColumn()
    const existing = await queryOne<{ pin_hash: string | null }>("SELECT pin_hash FROM participants WHERE id = $1 LIMIT 1", [session.participantId])
    if (existing?.pin_hash) return NextResponse.json({ success: false, error: "PIN is already configured" }, { status: 409 })
    const pinHash = await bcrypt.hash(pin, 12)
    await execute("UPDATE participants SET pin_hash = $1, updated_at = NOW() WHERE id = $2", [pinHash, session.participantId])
    return NextResponse.json({ success: true, pinConfigured: true })
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save PIN" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function PATCH(request: NextRequest) {
  return POST(request)
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: "PIN deletion is not allowed" }, { status: 405 })
}
