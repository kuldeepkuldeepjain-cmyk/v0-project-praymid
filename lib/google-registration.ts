import "server-only"
import { randomBytes } from "node:crypto"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, sql } from "drizzle-orm"
import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { z } from "zod"
import { getPool } from "@/lib/db"
import { getChallengePlan } from "@/lib/challenge-account"

const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(), username: text("username"), fullName: text("full_name"),
  mobileNumber: text("mobile_number"), country: text("country"), countryCode: text("country_code"),
  referralCode: text("referral_code"), referredBy: text("referred_by"),
  accountType: text("account_type"), challengePlanKey: text("challenge_plan_key"),
  challengeStatus: text("challenge_status"), status: text("status"),
  isActive: boolean("is_active"), otpVerified: boolean("otp_verified"),
  isDeleted: boolean("is_deleted"), detailsCompleted: boolean("details_completed"),
  referralCount: integer("referral_count"), totalReferrals: integer("total_referrals"),
})

export const googleRegistrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  mobileNumber: z.string().regex(/^\d{6,15}$/),
  referralCode: z.string().trim().max(10).default(""),
  accountType: z.enum(["normal", "funded", "challenge"]),
  challengePlanKey: z.string().max(80).optional(),
  acceptedTerms: z.literal(true),
}).superRefine((data, context) => {
  if ((data.country === "India" || data.countryCode === "+91") && !/^[6-9]\d{9}$/.test(data.mobileNumber)) {
    context.addIssue({ code: "custom", path: ["mobileNumber"], message: "Enter a valid 10-digit Indian mobile number." })
  }
  if (data.accountType === "challenge" && !getChallengePlan(data.challengePlanKey)) {
    context.addIssue({ code: "custom", path: ["challengePlanKey"], message: "Choose a valid Challenge plan." })
  }
})

export async function createGoogleParticipant(email: string, data: z.infer<typeof googleRegistrationSchema>): Promise<{ id: string } | { error: string }> {
  const pool = getPool()
  if (!pool) throw new Error("Database unavailable")
  const db = drizzle(pool)
  return db.transaction(async (transaction) => {
    const referralCode = data.referralCode.toUpperCase()
    if (referralCode) {
      const [referrer] = await transaction.select({ id: participants.id }).from(participants).where(eq(participants.referralCode, referralCode)).limit(1)
      if (!referrer) return { error: "Invalid referral code." } as const
    }
    // A Google-only account has no password; a password can be set through the verified reset flow.
    const [created] = await transaction.insert(participants).values({
      email, username: email, fullName: `${data.firstName} ${data.lastName}`,
      mobileNumber: `${data.countryCode}${data.mobileNumber}`, country: data.country, countryCode: data.countryCode,
      referralCode: randomBytes(5).toString("hex").toUpperCase(), referredBy: referralCode || null,
      accountType: data.accountType, challengePlanKey: data.accountType === "challenge" ? data.challengePlanKey : null,
      challengeStatus: "not_started", status: "active", isActive: true, otpVerified: true,
      isDeleted: false, detailsCompleted: false,
    }).onConflictDoNothing().returning({ id: participants.id })
    if (!created) return { error: "An account already exists. Please sign in with Google." } as const
    if (referralCode) {
      await transaction.update(participants).set({
        referralCount: sql`COALESCE(${participants.referralCount}, 0) + 1`,
        totalReferrals: sql`COALESCE(${participants.totalReferrals}, 0) + 1`,
      }).where(eq(participants.referralCode, referralCode))
    }
    return { id: created.id } as const
  })
}
