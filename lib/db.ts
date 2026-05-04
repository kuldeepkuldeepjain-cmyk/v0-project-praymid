import { Pool } from "pg"

let pool: Pool | null = null

export function getPool(): Pool | null {
  const connStr = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING
  if (!connStr) return null

  if (!pool) {
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes("supabase.co") || connStr.includes("pooler.supabase")
        ? { rejectUnauthorized: false }
        : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return pool
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const db = getPool()
  if (!db) throw new Error("No database connection configured")
  const result = await db.query(sql, params)
  return result.rows
}

export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const rows = await query(sql, params)
  return rows[0] ?? null
}
