import "server-only"
import { Pool } from "pg"

const globalForPools = globalThis as unknown as {
  _pgPoolV1?: Pool
  _pgPoolV2?: Pool
}

/**
 * Database Router
 * Routes queries to v1 (production) or v2 (new schema) based on environment variables
 * v1: Original database (keeps all existing data)
 * v2: New database (fresh, empty tables with restructured schema)
 */

function createPoolV1() {
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
  const url =
    process.env.DATABASE_URL_V2 ||
    process.env.POSTGRES_URL_V2 ||
    process.env.NEON_DATABASE_URL_V2

  if (!url) {
    console.warn("[v0] V2 database URL not configured. Set DATABASE_URL_V2 or NEON_DATABASE_URL_V2")
    return null
  }

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
 * Returns "v1" (default) or "v2" based on USE_DB_V2 environment variable
 */
export function getActiveDBVersion(): "v1" | "v2" {
  if (process.env.USE_DB_V2 === "true") {
    return "v2"
  }
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
 * Can force a specific version by passing forceVersion parameter
 */
export async function query<T = Record<string, any>>(
  sql: string,
  params: any[] = [],
  forceVersion?: "v1" | "v2"
): Promise<T[]> {
  const pool = forceVersion === "v1" ? getPoolV1() : forceVersion === "v2" ? getPoolV2() : getActivePool()

  if (!pool) {
    const version = forceVersion || getActiveDBVersion()
    throw new Error(`No database connection for ${version} — set DATABASE_URL_V2 or NEON_DATABASE_URL_V2`)
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
 * Execute using the active database version (for INSERT/UPDATE/DELETE)
 */
export async function execute(
  sql: string,
  params: any[] = [],
  forceVersion?: "v1" | "v2"
): Promise<number> {
  const pool = forceVersion === "v1" ? getPoolV1() : forceVersion === "v2" ? getPoolV2() : getActivePool()

  if (!pool) {
    const version = forceVersion || getActiveDBVersion()
    throw new Error(`No database connection for ${version} — set DATABASE_URL_V2 or NEON_DATABASE_URL_V2`)
  }

  const result = await pool.query(sql, params)
  return result.rowCount ?? 0
}

/**
 * Get service client that routes to v1 or v2
 * Usage: const db = getServiceClient()
 */
export function getServiceClient() {
  return {
    from: (table: string) => new TableQueryBuilder(table),
  }
}

/**
 * Lightweight query builder matching Supabase JS API
 * Routes to v1 or v2 based on active database version
 */
class TableQueryBuilder {
  private _table: string
  private _filters: { col: string; op: string; val: any }[] = []
  private _selectCols = "*"
  private _limitVal?: number
  private _orderCol?: string
  private _orderAsc = true
  private _insertData?: Record<string, any> | Record<string, any>[]
  private _updateData?: Record<string, any>
  private _isSingle = false
  private _isMaybeSingle = false
  private _isDelete = false
  private _forceVersion?: "v1" | "v2"

  constructor(table: string, forceVersion?: "v1" | "v2") {
    this._table = table
    this._forceVersion = forceVersion
  }

  select(cols = "*") { this._selectCols = cols; return this }
  eq(col: string, val: any) { this._filters.push({ col, op: "=", val }); return this }
  neq(col: string, val: any) { this._filters.push({ col, op: "!=", val }); return this }
  gt(col: string, val: any) { this._filters.push({ col, op: ">", val }); return this }
  gte(col: string, val: any) { this._filters.push({ col, op: ">=", val }); return this }
  lt(col: string, val: any) { this._filters.push({ col, op: "<", val }); return this }
  lte(col: string, val: any) { this._filters.push({ col, op: "<=", val }); return this }
  in(col: string, vals: any[]) { this._filters.push({ col, op: "IN", val: vals }); return this }
  is(col: string, val: any) { this._filters.push({ col, op: val === null ? "IS NULL" : "IS NOT NULL", val: null }); return this }
  limit(n: number) { this._limitVal = n; return this }
  order(col: string, opts?: { ascending?: boolean }) { this._orderCol = col; this._orderAsc = opts?.ascending !== false; return this }
  single() { this._isSingle = true; return this }
  maybeSingle() { this._isMaybeSingle = true; return this }
  insert(data: Record<string, any> | Record<string, any>[]) { this._insertData = data; return this }
  update(data: Record<string, any>) { this._updateData = data; return this }
  delete() { this._isDelete = true; return this }

  async then(onFulfilled?: any, onRejected?: any) {
    try {
      const result = await this._execute()
      return Promise.resolve(result).then(onFulfilled, onRejected)
    } catch (err) {
      return Promise.reject(err).then(onFulfilled, onRejected)
    }
  }

  private async _execute() {
    if (this._insertData) return this._executeInsert()
    if (this._updateData) return this._executeUpdate()
    if (this._isDelete) return this._executeDelete()
    return this._executeSelect()
  }

  private async _executeSelect() {
    let sql = `SELECT ${this._selectCols} FROM ${this._table}`
    const params: any[] = []
    let paramIdx = 1

    if (this._filters.length > 0) {
      const whereClause = this._filters.map(f => {
        if (f.op === "IN") {
          const placeholders = f.val.map(() => `$${paramIdx++}`).join(",")
          params.push(...f.val)
          return `${f.col} IN (${placeholders})`
        }
        if (f.op.includes("NULL")) {
          return `${f.col} ${f.op}`
        }
        params.push(f.val)
        return `${f.col} ${f.op} $${paramIdx++}`
      }).join(" AND ")
      sql += ` WHERE ${whereClause}`
    }

    if (this._orderCol) {
      sql += ` ORDER BY ${this._orderCol} ${this._orderAsc ? "ASC" : "DESC"}`
    }

    if (this._limitVal) {
      sql += ` LIMIT ${this._limitVal}`
    }

    const rows = await query(sql, params, this._forceVersion)
    if (this._isSingle && rows.length !== 1) throw new Error("Expected single row")
    if (this._isMaybeSingle && rows.length > 1) throw new Error("Expected 0 or 1 rows")
    return { data: this._isSingle || this._isMaybeSingle ? rows[0] : rows, error: null }
  }

  private async _executeInsert() {
    const dataArray = Array.isArray(this._insertData) ? this._insertData : [this._insertData]
    if (dataArray.length === 0) return { data: null, error: "No data to insert" }

    const keys = Object.keys(dataArray[0])
    const placeholders = dataArray.map((_, i) =>
      `(${keys.map((_, j) => `$${i * keys.length + j + 1}`).join(",")})`
    ).join(",")

    const values: any[] = []
    dataArray.forEach(row => keys.forEach(k => values.push(row[k])))

    const sql = `INSERT INTO ${this._table} (${keys.join(",")}) VALUES ${placeholders} RETURNING *`
    const rows = await query(sql, values, this._forceVersion)
    return { data: this._isSingle ? rows[0] : rows, error: null }
  }

  private async _executeUpdate() {
    if (this._filters.length === 0) throw new Error("Update requires at least one filter")

    const updateKeys = Object.keys(this._updateData!)
    const setClauses = updateKeys.map((k, i) => `${k}=$${i + 1}`).join(",")
    const params = Object.values(this._updateData!)
    let paramIdx = params.length + 1

    const whereClause = this._filters.map(f => {
      if (f.op.includes("NULL")) return `${f.col} ${f.op}`
      params.push(f.val)
      return `${f.col} ${f.op} $${paramIdx++}`
    }).join(" AND ")

    const sql = `UPDATE ${this._table} SET ${setClauses} WHERE ${whereClause} RETURNING *`
    const rows = await query(sql, params, this._forceVersion)
    return { data: rows, error: null }
  }

  private async _executeDelete() {
    if (this._filters.length === 0) throw new Error("Delete requires at least one filter")

    const params: any[] = []
    let paramIdx = 1

    const whereClause = this._filters.map(f => {
      if (f.op.includes("NULL")) return `${f.col} ${f.op}`
      params.push(f.val)
      return `${f.col} ${f.op} $${paramIdx++}`
    }).join(" AND ")

    const sql = `DELETE FROM ${this._table} WHERE ${whereClause}`
    await execute(sql, params, this._forceVersion)
    return { data: null, error: null }
  }
}
