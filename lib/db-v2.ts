import "server-only"
import { Pool } from "pg"

const globalForPoolV2 = globalThis as unknown as { _pgPoolV2?: Pool }

function createPoolV2() {
  const url =
    process.env.DATABASE_URL_V2 ||
    process.env.POSTGRES_URL_V2 ||
    process.env.NEON_DATABASE_URL_V2

  if (!url) {
    console.warn("[v0] V2 database URL not set. Set DATABASE_URL_V2 or POSTGRES_URL_V2")
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

export function getPoolV2(): Pool | null {
  if (!globalForPoolV2._pgPoolV2) {
    globalForPoolV2._pgPoolV2 = createPoolV2() ?? undefined
  }
  return globalForPoolV2._pgPoolV2 ?? null
}

// Helper: run a query on v2, returns rows
export async function queryV2<T = Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getPoolV2()
  if (!pool) throw new Error("V2 database not configured — set DATABASE_URL_V2")
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

// Helper: run a query on v2, return single row or null
export async function queryOneV2<T = Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await queryV2<T>(sql, params)
  return rows[0] ?? null
}

// Helper: run an insert/update/delete on v2, return rowCount
export async function executeV2(sql: string, params: any[] = []): Promise<number> {
  const pool = getPoolV2()
  if (!pool) throw new Error("V2 database not configured — set DATABASE_URL_V2")
  const result = await pool.query(sql, params)
  return result.rowCount ?? 0
}

// Compatibility shim for v2 — matches Supabase JS API surface used in project
export function getServiceClientV2() {
  return {
    from: (table: string) => new TableQueryBuilderV2(table),
  }
}

// Lightweight query builder for v2, matching Supabase surface
class TableQueryBuilderV2 {
  private _table: string
  private _filters: { col: string; op: string; val: any }[] = []
  private _selectCols = "*"
  private _limitVal?: number
  private _orderCol?: string
  private _orderAsc = true
  private _insertData?: Record<string, any> | Record<string, any>[]
  private _updateData?: Record<string, any>
  private _upsertData?: Record<string, any>
  private _upsertConflict?: string
  private _isSingle = false
  private _isMaybeSingle = false
  private _isDelete = false

  constructor(table: string) {
    this._table = table
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

  insert(data: Record<string, any> | Record<string, any>[]) {
    this._insertData = data
    return this
  }

  update(data: Record<string, any>) {
    this._updateData = data
    return this
  }

  upsert(data: Record<string, any>, opts?: { onConflict?: string }) {
    this._upsertData = data
    this._upsertConflict = opts?.onConflict
    return this
  }

  delete() {
    this._isDelete = true
    return this
  }

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
    if (this._upsertData) return this._executeUpsert()
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

    const rows = await queryV2(sql, params)
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
    const rows = await queryV2(sql, values)
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
    const rows = await queryV2(sql, params)
    return { data: rows, error: null }
  }

  private async _executeUpsert() {
    const keys = Object.keys(this._upsertData!)
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",")
    const params = Object.values(this._upsertData!)

    const conflictClause = this._upsertConflict
      ? `ON CONFLICT (${this._upsertConflict}) DO UPDATE SET ${keys.map(k => `${k}=EXCLUDED.${k}`).join(",")}`
      : ""

    const sql = `INSERT INTO ${this._table} (${keys.join(",")}) VALUES (${placeholders}) ${conflictClause} RETURNING *`
    const rows = await queryV2(sql, params)
    return { data: rows[0], error: null }
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
    await executeV2(sql, params)
    return { data: null, error: null }
  }
}
