import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const email = new URL(request.url).searchParams.get("email")?.toLowerCase().trim()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
    const db = getPool()
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    const result = await db.query(
      "SELECT id, participant_email, legal_name, date_of_birth, country, document_type, document_number, status, rejection_reason, submitted_at, reviewed_at FROM participant_kyc_verifications WHERE participant_email = $1 ORDER BY submitted_at DESC LIMIT 1",
      [email],
    )
    return NextResponse.json({ success: true, verification: result.rows[0] ?? null })
  } catch {
    return NextResponse.json({ error: "Unable to load KYC status" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || "").toLowerCase().trim()
    const legalName = String(body.legal_name || "").trim()
    const country = String(body.country || "").trim()
    const documentType = String(body.document_type || "").trim()
    if (!email || !legalName || !country || !documentType) {
      return NextResponse.json({ error: "Legal name, country, and document type are required" }, { status: 400 })
    }
    const db = getPool()
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    const participant = await db.query("SELECT id FROM participants WHERE email = $1", [email])
    if (!participant.rows[0]) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    const existing = await db.query("SELECT id, status FROM participant_kyc_verifications WHERE participant_email = $1 ORDER BY submitted_at DESC LIMIT 1", [email])
    if (["pending", "under_review", "approved"].includes(existing.rows[0]?.status)) {
      return NextResponse.json({ error: "A KYC request is already active", verification: existing.rows[0] }, { status: 409 })
    }
    const result = await db.query(
      `INSERT INTO participant_kyc_verifications (participant_id, participant_email, legal_name, date_of_birth, country, document_type, document_number, document_front_url, document_back_url, selfie_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, participant_email, legal_name, date_of_birth, country, document_type, document_number, status, submitted_at`,
      [participant.rows[0].id, email, legalName, body.date_of_birth || null, country, documentType, body.document_number?.trim() || null, body.document_front_url || null, body.document_back_url || null, body.selfie_url || null],
    )
    return NextResponse.json({ success: true, verification: result.rows[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unable to submit KYC request" }, { status: 500 })
  }
}
