import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { pgTable, text, uuid, timestamp, date } from "drizzle-orm/pg-core"
import { getPool } from "@/lib/db"

export const profileParticipants = pgTable("participants", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  username: text("username"),
  full_name: text("full_name"),
  wallet_address: text("wallet_address"),
  profile_image: text("profile_image"),
  updated_at: timestamp("updated_at", { withTimezone: true }),
})

export const profileVerifications = pgTable("participant_kyc_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  participant_id: text("participant_id").notNull(),
  participant_email: text("participant_email").notNull(),
  legal_name: text("legal_name").notNull(),
  date_of_birth: date("date_of_birth"),
  country: text("country").notNull(),
  document_type: text("document_type").notNull(),
  document_number: text("document_number"),
  document_front_url: text("document_front_url"),
  document_back_url: text("document_back_url"),
  selfie_url: text("selfie_url"),
  status: text("status").notNull().default("pending"),
  rejection_reason: text("rejection_reason"),
  submitted_at: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
})

export const verificationSummary = {
  id: profileVerifications.id,
  legal_name: profileVerifications.legal_name,
  date_of_birth: profileVerifications.date_of_birth,
  country: profileVerifications.country,
  document_type: profileVerifications.document_type,
  document_number: profileVerifications.document_number,
  status: profileVerifications.status,
  rejection_reason: profileVerifications.rejection_reason,
  submitted_at: profileVerifications.submitted_at,
  reviewed_at: profileVerifications.reviewed_at,
}

export function getProfileDatabase() {
  const pool = getPool()
  if (!pool) throw new Error("Database unavailable")
  return drizzle(pool)
}
