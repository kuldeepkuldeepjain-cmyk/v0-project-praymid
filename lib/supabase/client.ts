// Browser-safe stub — all real DB calls happen via API routes.
// This shim exists so client components that still call createClient()
// don't crash the build. Each method returns a no-op that resolves to
// { data: null, error: null } so existing call-sites degrade gracefully.

class BrowserStubBuilder {
  select(_cols = "*") { return this }
  eq(_col: string, _val: any) { return this }
  neq(_col: string, _val: any) { return this }
  gt(_col: string, _val: any) { return this }
  gte(_col: string, _val: any) { return this }
  lt(_col: string, _val: any) { return this }
  lte(_col: string, _val: any) { return this }
  in(_col: string, _vals: any[]) { return this }
  is(_col: string, _val: any) { return this }
  limit(_n: number) { return this }
  order(_col: string, _opts?: { ascending?: boolean }) { return this }
  single() { return this }
  maybeSingle() { return this }
  insert(_data: any) { return this }
  update(_data: any) { return this }
  upsert(_data: any, _opts?: any) { return this }
  delete() { return this }

  then(resolve: (v: { data: null; error: null }) => void) {
    resolve({ data: null, error: null })
  }
}

class BrowserStubClient {
  from(_table: string) {
    return new BrowserStubBuilder()
  }
}

export function createClient() {
  return new BrowserStubClient()
}
