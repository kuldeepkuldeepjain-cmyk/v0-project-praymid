/**
 * Supabase-compatible pg wrapper.
 * Replaces @supabase/ssr — all routes that import createClient from here
 * will use the pg pool instead of Supabase.
 */
import { query, queryOne, getPool } from "@/lib/db"

type FilterValue = string | number | boolean | null
type QueryBuilder = {
  select: (cols?: string) => QueryBuilder
  insert: (data: Record<string, any> | Record<string, any>[]) => QueryBuilder
  update: (data: Record<string, any>) => QueryBuilder
  delete: () => QueryBuilder
  eq: (col: string, val: FilterValue) => QueryBuilder
  neq: (col: string, val: FilterValue) => QueryBuilder
  gt: (col: string, val: FilterValue) => QueryBuilder
  gte: (col: string, val: FilterValue) => QueryBuilder
  lt: (col: string, val: FilterValue) => QueryBuilder
  lte: (col: string, val: FilterValue) => QueryBuilder
  in: (col: string, vals: FilterValue[]) => QueryBuilder
  is: (col: string, val: null) => QueryBuilder
  ilike: (col: string, pattern: string) => QueryBuilder
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder
  limit: (n: number) => QueryBuilder
  single: () => Promise<{ data: any; error: any }>
  maybeSingle: () => Promise<{ data: any; error: any }>
  then: (resolve: (v: { data: any; error: any }) => any) => Promise<any>
}

function buildQuery(table: string): QueryBuilder {
  let selectCols = "*"
  let insertData: Record<string, any> | Record<string, any>[] | null = null
  let updateData: Record<string, any> | null = null
  let isDelete = false
  const wheres: string[] = []
  const params: any[] = []
  let orderClause = ""
  let limitClause = ""
  let isSingle = false

  function addParam(val: any) {
    params.push(val)
    return `$${params.length}`
  }

  function addWhere(col: string, op: string, val: any) {
    if (val === null) {
      wheres.push(`"${col}" IS NULL`)
    } else {
      wheres.push(`"${col}" ${op} ${addParam(val)}`)
    }
    return builder
  }

  async function execute(): Promise<{ data: any; error: any }> {
    try {
      const pool = getPool()
      if (!pool) throw new Error("No database connection configured")
      const whereStr = wheres.length ? ` WHERE ${wheres.join(" AND ")}` : ""

      if (insertData !== null) {
        const rows = Array.isArray(insertData) ? insertData : [insertData]
        const keys = Object.keys(rows[0])
        const colStr = keys.map(k => `"${k}"`).join(", ")
        const allParams: any[] = []
        const valuePlaceholders = rows.map(row => {
          const start = allParams.length + 1
          keys.forEach(k => allParams.push(row[k]))
          return `(${keys.map((_, i) => `$${start + i}`).join(", ")})`
        })
        const sql = `INSERT INTO "${table}" (${colStr}) VALUES ${valuePlaceholders.join(", ")} RETURNING *`
        const result = await pool.query(sql, allParams)
        return { data: isSingle ? result.rows[0] ?? null : result.rows, error: null }
      }

      if (updateData !== null) {
        const keys = Object.keys(updateData)
        const setClauses = keys.map(k => `"${k}" = ${addParam(updateData![k])}`).join(", ")
        const sql = `UPDATE "${table}" SET ${setClauses}${whereStr} RETURNING *`
        const result = await pool.query(sql, params)
        return { data: isSingle ? result.rows[0] ?? null : result.rows, error: null }
      }

      if (isDelete) {
        const sql = `DELETE FROM "${table}"${whereStr}`
        await pool.query(sql, params)
        return { data: null, error: null }
      }

      // SELECT
      const sql = `SELECT ${selectCols} FROM "${table}"${whereStr}${orderClause}${limitClause}`
      const result = await pool.query(sql, params)
      if (isSingle) {
        return { data: result.rows[0] ?? null, error: null }
      }
      return { data: result.rows, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } }
    }
  }

  const builder: QueryBuilder = {
    select(cols = "*") { selectCols = cols; return builder },
    insert(data) { insertData = data; return builder },
    update(data) { updateData = data; return builder },
    delete() { isDelete = true; return builder },
    eq(col, val) { return addWhere(col, "=", val) },
    neq(col, val) { return addWhere(col, "!=", val) },
    gt(col, val) { return addWhere(col, ">", val) },
    gte(col, val) { return addWhere(col, ">=", val) },
    lt(col, val) { return addWhere(col, "<", val) },
    lte(col, val) { return addWhere(col, "<=", val) },
    in(col, vals) {
      const placeholders = vals.map(v => addParam(v)).join(", ")
      wheres.push(`"${col}" IN (${placeholders})`)
      return builder
    },
    is(col, _val) { wheres.push(`"${col}" IS NULL`); return builder },
    ilike(col, pattern) { wheres.push(`"${col}" ILIKE ${addParam(pattern)}`); return builder },
    order(col, opts = {}) {
      orderClause = ` ORDER BY "${col}" ${opts.ascending === false ? "DESC" : "ASC"}`
      return builder
    },
    limit(n) { limitClause = ` LIMIT ${n}`; return builder },
    async single() { isSingle = true; return execute() },
    async maybeSingle() { isSingle = true; return execute() },
    then(resolve) { return execute().then(resolve) },
  }

  return builder
}

export type SupabaseCompatClient = {
  from: (table: string) => QueryBuilder
  auth: { getSession: () => Promise<{ data: { session: null }; error: null }> }
}

export async function createClient(): Promise<SupabaseCompatClient> {
  return {
    from: (table: string) => buildQuery(table),
    auth: {
      async getSession() { return { data: { session: null }, error: null } },
    },
  }
}
