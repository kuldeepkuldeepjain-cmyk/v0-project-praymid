/**
 * Supabase-compatible query builder backed by @neondatabase/serverless.
 * All API routes that import { createClient } from "@/lib/supabase/server"
 * continue to work without modification.
 */
import { neon } from "@neondatabase/serverless"

const _neon = neon(process.env.DATABASE_URL!)

/** Run a parameterized query using the neon tagged-template trick */
async function execute(text: string, values: any[]): Promise<any[]> {
  if (values.length === 0) {
    const s = Object.assign([text], { raw: [text] }) as TemplateStringsArray
    return (_neon as any)(s) as any[]
  }
  // Split "SELECT … WHERE id = $1 AND x = $2" by "$N" placeholders
  const parts = text.split(/\$\d+/)
  const s = Object.assign([...parts], { raw: [...parts] }) as TemplateStringsArray
  return (_neon as any)(s, ...values) as any[]
}

type Condition =
  | { op: "="; col: string; val: any }
  | { op: "!="; col: string; val: any }
  | { op: "<"; col: string; val: any }
  | { op: "<="; col: string; val: any }
  | { op: ">"; col: string; val: any }
  | { op: ">="; col: string; val: any }
  | { op: "LIKE"; col: string; val: string }
  | { op: "IS NULL"; col: string }
  | { op: "IS NOT NULL"; col: string }
  | { op: "IN"; col: string; vals: any[] }
  | { op: "NOT IN"; col: string; vals: any[] }

/** Parse Supabase-style join selects: "*, participants:participant_id(username, wallet_address)" */
function parseSelect(cols: string): {
  mainCols: string
  join: { alias: string; fk: string; cols: string[] } | null
} {
  const joinRe = /,\s*(\w+):(\w+)\s*\(([^)]+)\)/g
  const joins: Array<{ alias: string; fk: string; cols: string[] }> = []
  let mainCols = cols
  let m: RegExpExecArray | null
  while ((m = joinRe.exec(cols)) !== null) {
    joins.push({ alias: m[1], fk: m[2], cols: m[3].split(",").map((c) => c.trim()) })
    mainCols = mainCols.replace(m[0], "")
  }
  return { mainCols: mainCols.trim().replace(/,\s*$/, "") || "*", join: joins[0] ?? null }
}

class QueryBuilder {
  private _table: string
  private _operation: "select" | "insert" | "update" | "delete" = "select"
  private _cols: string = "*"
  private _join: { alias: string; fk: string; cols: string[] } | null = null
  private _conditions: Condition[] = []
  private _orderCols: Array<{ col: string; asc: boolean }> = []
  private _limitVal: number | null = null
  private _offsetVal: number | null = null
  private _insertData: any = null
  private _updateData: Record<string, any> = {}
  private _countOnly = false

  constructor(table: string) {
    this._table = table
  }

  // ── Operations ────────────────────────────────────────────────────────────

  select(cols = "*", opts?: { count?: string }) {
    const { mainCols, join } = parseSelect(cols)
    this._cols = mainCols
    this._join = join
    this._operation = "select"
    if (opts?.count === "exact") this._countOnly = true
    return this
  }

  insert(data: Record<string, any> | Record<string, any>[]) {
    this._operation = "insert"
    this._insertData = data
    return this
  }

  update(data: Record<string, any>) {
    this._operation = "update"
    this._updateData = data
    return this
  }

  delete() {
    this._operation = "delete"
    return this
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  eq(col: string, val: any) {
    this._conditions.push({ op: "=", col, val })
    return this
  }

  neq(col: string, val: any) {
    this._conditions.push({ op: "!=", col, val })
    return this
  }

  lt(col: string, val: any) {
    this._conditions.push({ op: "<", col, val })
    return this
  }

  lte(col: string, val: any) {
    this._conditions.push({ op: "<=", col, val })
    return this
  }

  gt(col: string, val: any) {
    this._conditions.push({ op: ">", col, val })
    return this
  }

  gte(col: string, val: any) {
    this._conditions.push({ op: ">=", col, val })
    return this
  }

  like(col: string, val: string) {
    this._conditions.push({ op: "LIKE", col, val })
    return this
  }

  is(col: string, val: null | boolean) {
    if (val === null || val === false) {
      this._conditions.push({ op: "IS NULL", col })
    } else {
      this._conditions.push({ op: "IS NOT NULL", col })
    }
    return this
  }

  in(col: string, vals: any[]) {
    if (vals.length > 0) this._conditions.push({ op: "IN", col, vals })
    return this
  }

  // ── Modifiers ─────────────────────────────────────────────────────────────

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCols.push({ col, asc: opts?.ascending ?? true })
    return this
  }

  limit(n: number) {
    this._limitVal = n
    return this
  }

  offset(n: number) {
    this._offsetVal = n
    return this
  }

  // ── Terminators ───────────────────────────────────────────────────────────

  async single(): Promise<{ data: any; error: any }> {
    const res = await this._run()
    if (res.error) return { data: null, error: res.error }
    const rows = res.data as any[]
    if (!rows || rows.length === 0)
      return { data: null, error: { message: "No rows found", code: "PGRST116" } }
    return { data: rows[0], error: null }
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const res = await this._run()
    if (res.error) return { data: null, error: res.error }
    const rows = res.data as any[]
    return { data: rows?.[0] ?? null, error: null }
  }

  then(
    onfulfilled?: ((v: { data: any; error: any; count?: number }) => any) | null,
    onrejected?: ((r: any) => any) | null,
  ) {
    return this._run().then(onfulfilled, onrejected)
  }

  // ── Internal execution ────────────────────────────────────────────────────

  private async _run(): Promise<{ data: any; error: any; count?: number }> {
    try {
      switch (this._operation) {
        case "select":
          return await this._execSelect()
        case "insert":
          return await this._execInsert()
        case "update":
          return await this._execUpdate()
        case "delete":
          return await this._execDelete()
      }
    } catch (e: any) {
      console.error("[db-shim] error:", e?.message ?? e)
      return { data: null, error: { message: e?.message ?? String(e) } }
    }
  }

  private _buildWhere(values: any[]): string {
    if (this._conditions.length === 0) return ""
    const parts = this._conditions.map((c) => {
      if (c.op === "IS NULL") return `"${c.col}" IS NULL`
      if (c.op === "IS NOT NULL") return `"${c.col}" IS NOT NULL`
      if (c.op === "IN") {
        const placeholders = (c as any).vals.map((_: any) => {
          values.push(_)
          return `$${values.length}`
        })
        return `"${c.col}" IN (${placeholders.join(",")})`
      }
      if (c.op === "NOT IN") {
        const placeholders = (c as any).vals.map((_: any) => {
          values.push(_)
          return `$${values.length}`
        })
        return `"${c.col}" NOT IN (${placeholders.join(",")})`
      }
      values.push((c as any).val)
      return `"${c.col}" ${c.op} $${values.length}`
    })
    return "WHERE " + parts.join(" AND ")
  }

  private async _execSelect(): Promise<{ data: any; error: any; count?: number }> {
    const values: any[] = []
    const t = this._table

    let colsSQL = this._cols === "*" ? `"${t}".*` : this._cols
      .split(",")
      .map((c) => c.trim())
      .map((c) => (c === "*" ? `"${t}".*` : c.includes(".") ? c : `"${t}"."${c}"`))
      .join(", ")

    let joinSQL = ""
    if (this._join) {
      const j = this._join
      // LEFT JOIN joined_table ON joined_table.id = main_table.fk
      const jCols = j.cols
        .map((c) => `"${j.alias}"."${c}" AS "${j.alias}_${c}"`)
        .join(", ")
      colsSQL += `, ${jCols}`
      joinSQL = `LEFT JOIN "${j.alias}" ON "${j.alias}"."id" = "${t}"."${j.fk}"`
    }

    const whereSQL = this._buildWhere(values)
    const orderSQL =
      this._orderCols.length > 0
        ? "ORDER BY " +
          this._orderCols.map((o) => `"${t}"."${o.col}" ${o.asc ? "ASC" : "DESC"}`).join(", ")
        : ""
    const limitSQL = this._limitVal !== null ? `LIMIT ${this._limitVal}` : ""
    const offsetSQL = this._offsetVal !== null ? `OFFSET ${this._offsetVal}` : ""

    const query = `SELECT ${colsSQL} FROM "${t}" ${joinSQL} ${whereSQL} ${orderSQL} ${limitSQL} ${offsetSQL}`.replace(
      /\s+/g,
      " ",
    ).trim()

    const rows = await execute(query, values)

    // If join: reshape rows to include nested object
    let data = rows as any[]
    if (this._join) {
      const j = this._join
      data = rows.map((row: any) => {
        const nested: Record<string, any> = {}
        for (const c of j.cols) {
          const key = `${j.alias}_${c}`
          nested[c] = row[key] ?? null
          delete row[key]
        }
        return { ...row, [j.alias]: nested }
      })
    }

    if (this._countOnly) {
      return { data, error: null, count: data.length }
    }

    return { data, error: null, count: data.length }
  }

  private async _execInsert(): Promise<{ data: any; error: any }> {
    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData]
    if (rows.length === 0) return { data: [], error: null }

    const keys = Object.keys(rows[0])
    const values: any[] = []
    const valueSets = rows.map((row: any) => {
      const placeholders = keys.map((k) => {
        values.push(row[k])
        return `$${values.length}`
      })
      return `(${placeholders.join(",")})`
    })

    const cols = keys.map((k) => `"${k}"`).join(",")
    const query = `INSERT INTO "${this._table}" (${cols}) VALUES ${valueSets.join(",")} RETURNING *`
    const data = await execute(query, values)
    return { data: Array.isArray(this._insertData) ? data : data[0] ?? null, error: null }
  }

  private async _execUpdate(): Promise<{ data: any; error: any; count: number }> {
    const entries = Object.entries(this._updateData)
    if (entries.length === 0) return { data: null, error: { message: "No fields to update" }, count: 0 }

    const values: any[] = []
    const setClauses = entries.map(([k, v]) => {
      values.push(v)
      return `"${k}" = $${values.length}`
    })

    const whereSQL = this._buildWhere(values)
    const query = `UPDATE "${this._table}" SET ${setClauses.join(",")} ${whereSQL} RETURNING *`
    const data = await execute(query, values)
    return { data, error: null, count: data.length }
  }

  private async _execDelete(): Promise<{ data: any; error: any; count: number }> {
    const values: any[] = []
    const whereSQL = this._buildWhere(values)
    const query = `DELETE FROM "${this._table}" ${whereSQL} RETURNING *`
    const data = await execute(query, values)
    return { data, error: null, count: data.length }
  }
}

/** Drop-in replacement for `await createClient()` from @supabase/ssr */
function buildClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },
  }
}

/** Async wrapper kept for API-route compatibility: `const supabase = await createClient()` */
export async function createClient() {
  return buildClient()
}
