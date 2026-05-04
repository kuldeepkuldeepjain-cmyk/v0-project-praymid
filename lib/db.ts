import { Pool } from "pg"

const globalForPool = globalThis as unknown as { _pgPool?: Pool }

function createPool() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (!url) return null
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
}

export function getPool(): Pool | null {
  if (!globalForPool._pgPool) {
    globalForPool._pgPool = createPool() ?? undefined
  }
  return globalForPool._pgPool ?? null
}

// Helper: run a query, returns rows
export async function query<T = Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getPool()
  if (!pool) throw new Error("No database connection — POSTGRES_URL not set")
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

// Helper: run a query, return single row or null
export async function queryOne<T = Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

// Helper: run an insert/update/delete, return rowCount
export async function execute(sql: string, params: any[] = []): Promise<number> {
  const pool = getPool()
  if (!pool) throw new Error("No database connection — POSTGRES_URL not set")
  const result = await pool.query(sql, params)
  return result.rowCount ?? 0
}

// Compatibility shim — used by routes that call getServiceClient()
export function getServiceClient() {
  return {
    from: (table: string) => new TableQueryBuilder(table),
  }
}

// Lightweight query builder matching the Supabase JS API surface used in this project
class TableQueryBuilder {
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
    this._insertData = data; return this
  }

  update(data: Record<string, any>) {
    this._updateData = data; return this
  }

  upsert(data: Record<string, any>, opts?: { onConflict?: string }) {
    this._upsertData = data; this._upsertConflict = opts?.onConflict; return this
  }

  delete() { this._isDelete = true; return this }

  // Build WHERE clause
  private _buildWhere(startIdx = 1): { clause: string; params: any[] } {
    if (this._filters.length === 0) return { clause: "", params: [] }
    const params: any[] = []
    const parts = this._filters.map(f => {
      if (f.op === "IS NULL" || f.op === "IS NOT NULL") return `"${f.col}" ${f.op}`
      if (f.op === "IN") {
        const placeholders = f.val.map((_: any, i: number) => `$${startIdx + params.length + i}`).join(", ")
        params.push(...f.val)
        return `"${f.col}" IN (${placeholders})`
      }
      params.push(f.val)
      return `"${f.col}" ${f.op} $${startIdx + params.length - 1}`
    })
    return { clause: `WHERE ${parts.join(" AND ")}`, params }
  }

  async then(resolve: (v: { data: any; error: any }) => void, reject: (e: any) => void) {
    try {
      const result = await this._execute()
      resolve(result)
    } catch (e) {
      reject(e)
    }
  }

  catch(fn: (e: any) => any) {
    return this._execute().catch(fn)
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    const pool = getPool()
    if (!pool) return { data: null, error: new Error("No database connection") }

    try {
      // DELETE
      if (this._isDelete) {
        const { clause, params } = this._buildWhere(1)
        await pool.query(`DELETE FROM "${this._table}" ${clause}`, params)
        return { data: null, error: null }
      }

      // INSERT
      if (this._insertData !== undefined) {
        const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData]
        const cols = Object.keys(rows[0])
        const allParams: any[] = []
        const valueSets = rows.map(row => {
          const placeholders = cols.map((_, i) => `$${allParams.length + i + 1}`)
          cols.forEach(c => allParams.push(row[c]))
          return `(${placeholders.join(", ")})`
        })
        const sql = `INSERT INTO "${this._table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES ${valueSets.join(", ")} RETURNING *`
        const res = await pool.query(sql, allParams)
        if (this._isSingle || this._isMaybeSingle) return { data: res.rows[0] ?? null, error: null }
        return { data: res.rows, error: null }
      }

      // UPSERT
      if (this._upsertData !== undefined) {
        const cols = Object.keys(this._upsertData)
        const params = cols.map(c => this._upsertData![c])
        const placeholders = cols.map((_, i) => `$${i + 1}`)
        const conflictCol = this._upsertConflict || cols[0]
        const updateSet = cols.filter(c => c !== conflictCol).map((c, i) => `"${c}" = $${i + cols.indexOf(conflictCol) + 2}`).join(", ")
        const sql = `INSERT INTO "${this._table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSet} RETURNING *`
        const res = await pool.query(sql, params)
        return { data: res.rows[0] ?? null, error: null }
      }

      // UPDATE
      if (this._updateData !== undefined) {
        const cols = Object.keys(this._updateData)
        const params: any[] = cols.map(c => this._updateData![c])
        const setClause = cols.map((c, i) => `"${c}" = $${i + 1}`).join(", ")
        const { clause, params: whereParams } = this._buildWhere(cols.length + 1)
        const sql = `UPDATE "${this._table}" SET ${setClause} ${clause} RETURNING *`
        const res = await pool.query(sql, [...params, ...whereParams])
        if (this._isSingle || this._isMaybeSingle) return { data: res.rows[0] ?? null, error: null }
        return { data: res.rows, error: null }
      }

      // SELECT
      const { clause, params } = this._buildWhere(1)
      let sql = `SELECT ${this._selectCols} FROM "${this._table}" ${clause}`
      if (this._orderCol) sql += ` ORDER BY "${this._orderCol}" ${this._orderAsc ? "ASC" : "DESC"}`
      if (this._limitVal !== undefined) sql += ` LIMIT ${this._limitVal}`
      const res = await pool.query(sql, params)
      if (this._isSingle) return { data: res.rows[0] ?? null, error: null }
      if (this._isMaybeSingle) return { data: res.rows[0] ?? null, error: null }
      return { data: res.rows, error: null }
    } catch (e: any) {
      return { data: null, error: e }
    }
  }
}
