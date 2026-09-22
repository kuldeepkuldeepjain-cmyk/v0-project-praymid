import "server-only"

import { createHash } from "node:crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getPool } from "@/lib/db"
import type { NextRequest } from "next/server"

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

const limiters = {
  login: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), prefix: "security:login" }) : null,
  trade: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "security:trade" }) : null,
  api: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, "1 m"), prefix: "security:api" }) : null,
}

export type SecurityContext = {
  ipAddress: string | null
  userAgent: string | null
  deviceHash: string
}

export function getSecurityContext(request: NextRequest): SecurityContext {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ipAddress = (forwardedFor?.split(",")[0]?.trim() || realIp || null)
  const userAgent = request.headers.get("user-agent")
  const deviceInput = [
    userAgent || "unknown",
    request.headers.get("accept-language") || "unknown",
    request.headers.get("sec-ch-ua") || "unknown",
    request.headers.get("sec-ch-ua-platform") || "unknown",
  ].join("|")

  return { ipAddress, userAgent, deviceHash: createHash("sha256").update(deviceInput).digest("hex") }
}

export async function enforceRateLimit(
  bucket: keyof typeof limiters,
  key: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = limiters[bucket]
  if (!limiter) return { allowed: false, retryAfter: 60 }
  const result = await limiter.limit(key)
  return { allowed: result.success, retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) }
}

function canonicalize(value: unknown): string {
  return JSON.stringify(value, Object.keys((value && typeof value === "object" && !Array.isArray(value)) ? value as object : {}).sort())
}

export async function recordSecurityEvent(input: {
  eventType: string
  actorType?: string
  actorId?: string | null
  actorEmail?: string | null
  request?: NextRequest
  resourceType?: string | null
  resourceId?: string | null
  riskScore?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = getPool()
  if (!db) return

  const context = input.request ? getSecurityContext(input.request) : null
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(hashtext('security_events_chain'))")
    const previous = await client.query("SELECT event_hash FROM security_events ORDER BY created_at DESC, id DESC LIMIT 1")
    const previousHash = previous.rows[0]?.event_hash || "GENESIS"
    const payload = {
      eventType: input.eventType,
      actorType: input.actorType || "system",
      actorId: input.actorId || null,
      actorEmail: input.actorEmail || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      deviceHash: context?.deviceHash || null,
      resourceType: input.resourceType || null,
      resourceId: input.resourceId || null,
      riskScore: Math.max(0, Math.min(100, input.riskScore || 0)),
      metadata: input.metadata || {},
      previousHash,
    }
    const eventHash = createHash("sha256").update(`${previousHash}:${canonicalize(payload)}`).digest("hex")
    await client.query(
      `INSERT INTO security_events
        (event_type, actor_type, actor_id, actor_email, ip_address, user_agent, device_hash,
         resource_type, resource_id, risk_score, metadata, previous_hash, event_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        input.eventType, input.actorType || "system", input.actorId || null, input.actorEmail || null,
        context?.ipAddress || null, context?.userAgent || null, context?.deviceHash || null,
        input.resourceType || null, input.resourceId || null, payload.riskScore, JSON.stringify(input.metadata || {}),
        previousHash, eventHash,
      ],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[v0] security event write failed", error)
  } finally {
    client.release()
  }
}

export async function updateParticipantSecurityProfile(
  email: string,
  request: NextRequest,
  riskScore: number,
): Promise<{ duplicateAccountCount: number; sameDeviceAccounts: number; sameIpAccounts: number }> {
  const db = getPool()
  if (!db) return { duplicateAccountCount: 0, sameDeviceAccounts: 0, sameIpAccounts: 0 }
  const context = getSecurityContext(request)
  const sameDevice = await db.query(
    `SELECT COUNT(*)::int AS count FROM participant_security_profiles WHERE last_seen_device_hash = $1 AND participant_email <> $2`,
    [context.deviceHash, email],
  )
  const sameIp = context.ipAddress ? await db.query(
    `SELECT COUNT(*)::int AS count FROM participant_security_profiles WHERE last_seen_ip = $1 AND participant_email <> $2`,
    [context.ipAddress, email],
  ) : { rows: [{ count: 0 }] }
  const duplicateAccountCount = Number(sameDevice.rows[0]?.count || 0) + Number(sameIp.rows[0]?.count || 0)
  await db.query(
    `INSERT INTO participant_security_profiles
      (participant_email, first_seen_ip, first_seen_device_hash, last_seen_ip, last_seen_device_hash, risk_score, duplicate_account_count, last_seen_at, updated_at)
     VALUES ($1,$2,$3,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (participant_email) DO UPDATE SET
       last_seen_ip = EXCLUDED.last_seen_ip, last_seen_device_hash = EXCLUDED.last_seen_device_hash,
       risk_score = GREATEST(participant_security_profiles.risk_score, EXCLUDED.risk_score),
       duplicate_account_count = EXCLUDED.duplicate_account_count, last_seen_at = NOW(), updated_at = NOW()`,
    [email, context.ipAddress, context.deviceHash, Math.max(0, Math.min(100, riskScore)), duplicateAccountCount],
  )
  return { duplicateAccountCount, sameDeviceAccounts: Number(sameDevice.rows[0]?.count || 0), sameIpAccounts: Number(sameIp.rows[0]?.count || 0) }
}

export async function inspectTradeRisk(input: {
  email: string
  trade: { id: string; pair?: string; direction?: string; lotSize?: number; leverage?: number }
}): Promise<{ riskScore: number; flags: string[] }> {
  const db = getPool()
  if (!db) return { riskScore: 0, flags: [] }
  const recent = await db.query(
    `SELECT direction, lot_size, created_at FROM forex_trades
     WHERE participant_email = $1 AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 20`,
    [input.email],
  )
  const flags: string[] = []
  if (recent.rows.length >= 10) flags.push("rapid_trade_burst")
  if (input.trade.leverage && input.trade.leverage > 100) flags.push("excessive_leverage")
  if (input.trade.lotSize && input.trade.lotSize > 10) flags.push("unusual_position_size")
  const sameDirection = input.trade.direction && recent.rows.filter((row: { direction?: string }) => row.direction === input.trade.direction).length >= 8
  if (sameDirection) flags.push("direction_concentration")
  return { riskScore: Math.min(100, flags.length * 25), flags }
}

export async function recordTradeRiskFlags(email: string, tradeId: string, risk: { riskScore: number; flags: string[] }): Promise<void> {
  const db = getPool()
  if (!db || risk.flags.length === 0) return
  for (const flag of risk.flags) {
    await db.query(
      `INSERT INTO trade_risk_flags (trade_id, participant_email, flag_type, severity, evidence)
       VALUES ($1,$2,$3,$4,$5)`,
      [tradeId, email, flag, risk.riskScore >= 75 ? "high" : "medium", JSON.stringify({ riskScore: risk.riskScore })],
    )
  }
}
