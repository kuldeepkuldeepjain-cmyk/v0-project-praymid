import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { identityDetailsSchema, verificationState } from "@/lib/participant-profile"
import { getProfileDatabase, profileParticipants, profileVerifications, verificationSummary } from "@/lib/participant-profile-db"

const imageSchema = z.string().max(1_500_000, "An image is too large. Please reselect it.").refine(value => {
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return true
  try { return new URL(value).protocol === "https:" } catch { return false }
}, "Add a valid image for the document front, back, and selfie.")
const submissionSchema = identityDetailsSchema.extend({ document_front_url: imageSchema, document_back_url: imageSchema, selfie_url: imageSchema })
const privateHeaders = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response
    const email = session.email.toLowerCase().trim()
    const requestedEmail = new URL(request.url).searchParams.get("email")?.toLowerCase().trim()
    if (requestedEmail && requestedEmail !== email) return NextResponse.json({ error: "You can only view your own verification" }, { status: 403 })
    const [verification] = await getProfileDatabase().select(verificationSummary).from(profileVerifications).where(and(
      eq(profileVerifications.participant_id, session.participantId), eq(profileVerifications.participant_email, email),
    )).orderBy(desc(profileVerifications.submitted_at)).limit(1)
    return NextResponse.json({ success: true, verification: verification ?? null }, { headers: privateHeaders })
  } catch {
    return NextResponse.json({ error: "Unable to load verification status. Please try again." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response
    const parsed = submissionSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your verification details" }, { status: 400 })
    const email = session.email.toLowerCase().trim()
    const db = getProfileDatabase()
    const [participant] = await db.select({ id: profileParticipants.id }).from(profileParticipants).where(and(eq(profileParticipants.id, session.participantId), eq(profileParticipants.email, email))).limit(1)
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    const [existing] = await db.select(verificationSummary).from(profileVerifications).where(and(eq(profileVerifications.participant_id, session.participantId), eq(profileVerifications.participant_email, email))).orderBy(desc(profileVerifications.submitted_at)).limit(1)
    if (existing && ["review", "verified"].includes(verificationState(existing.status))) return NextResponse.json({ error: "A verification request is already active", verification: existing }, { status: 409, headers: privateHeaders })
    const [verification] = await db.insert(profileVerifications).values({ participant_id: participant.id, participant_email: email, ...parsed.data }).returning(verificationSummary)
    return NextResponse.json({ success: true, verification }, { status: 201, headers: privateHeaders })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    return NextResponse.json({ error: "Unable to submit your verification. Your details are still available on this screen; please try again." }, { status: 500 })
  }
}
