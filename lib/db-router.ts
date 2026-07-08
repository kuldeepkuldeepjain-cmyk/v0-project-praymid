import "server-only"
import { Pool } from "pg"

const globalForPools = globalThis as unknown as {
  _pgPoolV1?: Pool
  _pgPoolV2?: Pool
}

/**
 * Database Router
 * Routes queries to v1 (production) or v2 (new schema) based on environment or feature flags
 */

function createPoolV1() {
  // Use existing NEON_DATABASE_URL for v1 (current production database)
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL

  if (!url) return null

  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
}

function createPoolV2() {
  // Use new NEON_DATABASE_URL_V2 for v2 (new schema database)
  const url = process.env.NEON_DATABASE_URL_V2

  if (!url) return null

  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
}

export function getPoolV1(): Pool | null {
  if (!globalForPools._pgPoolV1) {
    globalForPools._pgPoolV1 = createPoolV1() ?? undefined
  }
  return globalForPools._pgPoolV1 ?? null
}

export function getPoolV2(): Pool | null {
  if (!globalForPools._pgPoolV2) {
    globalForPools._pgPoolV2 = createPoolV2() ?? undefined
  }
  return globalForPools._pgPoolV2 ?? null
}

/**
 * Determine which database version to use
 * Returns "v1" or "v2" based on:
 * 1. USE_DB_V2 environment variable (if set to "true")
 * 2. Feature flag (future: can add per-route or per-user logic)
 */
export function getActiveDBVersion(): "v1" | "v2" {
  // Check environment variable
  if (process.env.USE_DB_V2 === "true") {
    return "v2"
  }

  // Default to v1 for safety (gradual migration)
  return "v1"
}

/**
 * Get the appropriate pool based on active database version
 */
export function getActivePool(): Pool | null {
  const version = getActiveDBVersion()

  if (version === "v2") {
    return getPoolV2()
  }

  return getPoolV1()
}

/**
 * Health check for both databases
 */
export async function checkDatabaseHealth(
  version: "v1" | "v2" | "both" = "both"
): Promise<{ v1?: boolean; v2?: boolean }> {
  const result: { v1?: boolean; v2?: boolean } = {}

  if (version === "v1" || version === "both") {
    try {
      const poolV1 = getPoolV1()
      if (poolV1) {
        await poolV1.query("SELECT 1")
        result.v1 = true
      } else {
        result.v1 = false
      }
    } catch {
      result.v1 = false
    }
  }

  if (version === "v2" || version === "both") {
    try {
      const poolV2 = getPoolV2()
      if (poolV2) {
        await poolV2.query("SELECT 1")
        result.v2 = true
      } else {
        result.v2 = false
      }
    } catch {
      result.v2 = false
    }
  }

  return result
}

/**
 * Query using the active database version
 */
export async function query<T = Record<string, any>>(
  sql: string,
  params: any[] = [],
  forceVersion?: "v1" | "v2"
): Promise<T[]> {
  const pool = forceVersion === "v1" ? getPoolV1() : forceVersion === "v2" ? getPoolV2() : getActivePool()

  if (!pool) {
    const version = forceVersion || getActiveDBVersion()
    throw new Error(`No database connection for ${version} — check DATABASE_URL or NEON_DATABASE_URL_V2`)
  }

  const result = await pool.query(sql, params)
  return result.rows as T[]
}

/**
 * Query one using the active database version
 */
export async function queryOne<T = Record<string, any>>(
  sql: string,
  params: any[] = [],
  forceVersion?: "v1" | "v2"
): Promise<T | null> {
  const rows = await query<T>(sql, params, forceVersion)
  return rows[0] ?? null
}

/**
 * Execute using the active database version
 */
export async function execute(
  sql: string,
  params: any[] = [],
  forceVersion?: "v1" | "v2"
): Promise<number> {
  const pool = forceVersion === "v1" ? getPoolV1() : forceVersion === "v2" ? getPoolV2() : getActivePool()

  if (!pool) {
    const version = forceVersion || getActiveDBVersion()
    throw new Error(`No database connection for ${version} — check DATABASE_URL or NEON_DATABASE_URL_V2`)
  }

  const result = await pool.query(sql, params)
  return result.rowCount ?? 0
}

/**
 * Direct pool access for both versions (for backwards compatibility)
 */
export { getPoolV1, getPoolV2 }
