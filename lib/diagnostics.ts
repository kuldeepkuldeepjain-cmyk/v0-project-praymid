// lib/diagnostics.ts - System Diagnostic (Postgres/pg version)

export class SystemDiagnostics {
  results: {
    environment: any
    database: any
    network: any
    storage: any
    errors: string[]
  }

  constructor() {
    this.results = { environment: {}, database: {}, network: {}, storage: {}, errors: [] }
  }

  async runAll() {
    this.checkEnvironment()
    await this.checkDatabase()
    await this.checkNetwork()
    this.checkStorage()
    const issues = this.displayResults()
    return { results: this.results, criticalIssues: issues }
  }

  checkEnvironment() {
    this.results.environment = {
      hostname: typeof window !== "undefined" ? window.location.hostname : "server",
      NODE_ENV: process.env.NODE_ENV,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasPostgresNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
    }
  }

  async checkDatabase() {
    try {
      const res = await fetch("/api/health")
      this.results.database = { connected: res.ok, status: res.status }
    } catch (e: any) {
      this.results.database = { connected: false, error: e.message }
      this.results.errors.push("Database health check failed")
    }
  }

  async checkNetwork() {
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) })
      this.results.network = { apiReachable: res.ok, status: res.status }
    } catch (e: any) {
      this.results.network = { apiReachable: false, error: e.message }
    }
  }

  checkStorage() {
    if (typeof window === "undefined") { this.results.storage = { server: true }; return }
    try {
      localStorage.setItem("__test__", "1")
      localStorage.removeItem("__test__")
      this.results.storage = { localStorage: true, hasAuthToken: !!localStorage.getItem("flowchain-auth-token") }
    } catch (e: any) {
      this.results.storage = { error: e.message }
    }
  }

  displayResults() {
    const criticalIssues: string[] = []
    if (!this.results.environment.hasPostgresUrl) criticalIssues.push("CRITICAL: POSTGRES_URL not set")
    if (!this.results.database.connected) criticalIssues.push("CRITICAL: Database not reachable")
    return criticalIssues
  }
}

if (typeof window !== "undefined") {
  (window as any).__runDiagnostics = async () => {
    const d = new SystemDiagnostics()
    const r = await d.runAll()
    ;(window as any).__diagnostics = r
    return r
  }
}
