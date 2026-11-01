import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { profileDetailsSchema } from "@/lib/participant-profile"
import { getProfileDatabase, profileParticipants } from "@/lib/participant-profile-db"

const profilePatchSchema = profileDetailsSchema.partial().extend({
  wallet_address: profileDetailsSchema.shape.bep20_address.optional(),
  profile_image: z.string().max(1_500_000, "Choose a smaller profile photo.").regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Upload a valid JPG, PNG, or WebP photo.").nullable().optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response
    const parsed = profilePatchSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile details" }, { status: 400 })
    const body = parsed.data
    const updates: Partial<typeof profileParticipants.$inferInsert> = {}
    if (body.full_name !== undefined) updates.full_name = body.full_name || null
    if (body.username !== undefined) updates.username = body.username
    if (body.profile_image !== undefined) updates.profile_image = body.profile_image
    const wallet = body.bep20_address ?? body.wallet_address
    if (wallet !== undefined) updates.wallet_address = wallet || null
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    updates.updated_at = new Date()
    const [participant] = await getProfileDatabase().update(profileParticipants).set(updates).where(and(
      eq(profileParticipants.id, session.participantId),
      eq(profileParticipants.email, session.email.toLowerCase().trim()),
    )).returning({ id: profileParticipants.id, username: profileParticipants.username, full_name: profileParticipants.full_name, wallet_address: profileParticipants.wallet_address, profile_image: profileParticipants.profile_image })
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    return NextResponse.json({ success: true, participant: { ...participant, bep20_address: participant.wallet_address } }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } }
    if (databaseError.code === "23505" || databaseError.cause?.code === "23505") return NextResponse.json({ error: "That username is already in use. Please choose another." }, { status: 409 })
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    return NextResponse.json({ error: "Your profile could not be saved. Please try again." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response
    const requestedEmail = new URL(request.url).searchParams.get("email")?.toLowerCase().trim()
    const normalizedEmail = session.email.toLowerCase().trim()
    if (requestedEmail && requestedEmail !== normalizedEmail) return NextResponse.json({ error: "You can only view your own profile" }, { status: 403 })

    const db = getPool()!
    let result
    let topUpCount = 0
    let fundedTierTopUpCount = 0

    try {
      result = await db.query(
        `SELECT
          p.*,
          COALESCE(topups.count, 0)::int AS top_up_count,
          COALESCE(topups.funded_tier_count, 0)::int AS funded_tier_top_up_count
         FROM participants p
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*) AS count,
             COUNT(*) FILTER (WHERE payment_method = 'funded_tier') AS funded_tier_count
           FROM topup_requests
           WHERE participant_id = p.id
         ) topups ON TRUE
         WHERE p.email = $1`,
        [normalizedEmail]
      )
      topUpCount = Number(result.rows[0]?.top_up_count) || 0
      fundedTierTopUpCount = Number(result.rows[0]?.funded_tier_top_up_count) || 0
    } catch (error) {
      // Keep profile reads available on deployments without the optional top-up schema.
      const code = (error as { code?: string }).code
      if (code !== "42P01" && code !== "42703") throw error
      result = await db.query(
        "SELECT * FROM participants WHERE email = $1",
        [normalizedEmail]
      )
    }

    const p = result.rows[0]
    if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      participant: {
        ...Object.fromEntries(Object.entries(p).filter(([key]) => !/password|otp|pin_hash|secret|token/i.test(key))),
        bep20_address: p.wallet_address || null,
        next_contribution_date: p.next_contribution_date || null,
        last_contribution_date: p.last_contribution_date || null,
        // Coerce PostgreSQL numeric strings to JS numbers
        account_balance: Number(p.account_balance) || 0,
        wallet_balance: Number(p.wallet_balance ?? p.account_balance) || 0,
        bonus_balance: Number(p.bonus_balance) || 0,
        total_earnings: Number(p.total_earnings) || 0,
        contributed_amount: Number(p.contributed_amount) || 0,
        participation_count: Number(p.participation_count) || 0,
        top_up_count: topUpCount,
        funded_tier_top_up_count: fundedTierTopUpCount,
        has_funded_tier_top_up: fundedTierTopUpCount > 0,
        has_prior_top_up: topUpCount > 0,
        pinConfigured: Boolean(p.pin_hash),
      },
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
