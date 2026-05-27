// lib/diagnostics.ts - Complete System Diagnostic (Neon version)

export class SystemDiagnostics {
  results: {
    environment: any
    database: any
    network: any
    storage: any
    errors: string[]
  }

  constructor() {
    this.results = {
      environment: {},
      database: {},
      network: {},
      storage: {},
      errors: [],
    }
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
      origin: typeof window !== "undefined" ? window.location.origin : "server",
      protocol: typeof window !== "undefined" ? window.location.protocol : "server",
      isLocalhost:
        typeof window !== "undefined"
          ? window.location.hostname === "localhost" || window.location.hostname.includes("v0.")
          : false,
      isProduction:
        typeof window !== "undefined"
          ? !window.location.hostname.includes("localhost") && !window.location.hostname.includes("v0.")
          : false,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      cookiesEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled : false,
      onLine: typeof navigator !== "undefined" ? navigator.onLine : true,
      envVars: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
    }
  }

  async checkDatabase() {
    try {
      const { sql } = await import("@/lib/db")
      const rows = await sql`SELECT 1 AS ok`
      this.results.database = {
        connected: rows?.[0]?.ok === 1,
        provider: "Neon (PostgreSQL)",
      }
    } catch (error: any) {
      this.results.database = {
        connected: false,
        error: error.message,
      }
      this.results.errors.push(`Database connection failed: ${error.message}`)
    }
  }

  async checkNetwork() {
    const tests = [this.testEndpoint("Health Check", "/api/health")]
    const results = await Promise.allSettled(tests)

    this.results.network.tests = results.map((r) => ({
      name: "API Health",
      status: r.status,
      result: r.status === "fulfilled" ? r.value : (r as PromiseRejectedResult).reason,
    }))
  }

  async testEndpoint(name: string, url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000),
      })
      return { name, success: response.ok, status: response.status, statusText: response.statusText }
    } catch (error: any) {
      return { name, success: false, error: error.message }
    }
  }

  checkStorage() {
    if (typeof window === "undefined") {
      this.results.storage = { server: true }
      return
    }

    try {
      const testKey = "__test__"
      localStorage.setItem(testKey, "test")
      const canRead = localStorage.getItem(testKey) === "test"
      localStorage.removeItem(testKey)

      this.results.storage = {
        localStorage: canRead,
        sessionStorage: !!window.sessionStorage,
        cookies: navigator.cookieEnabled,
        hasAuthToken: !!localStorage.getItem("flowchain-auth-token"),
      }
    } catch (error: any) {
      this.results.storage = { error: error.message, available: false }
      this.results.errors.push(`Storage test failed: ${error.message}`)
    }
  }

  displayResults() {
    const criticalIssues: string[] = []

    if (!this.results.environment.envVars.DATABASE_URL) {
      criticalIssues.push("CRITICAL: DATABASE_URL not set")
    }

    if (!this.results.database.connected) {
      criticalIssues.push("CRITICAL: Cannot connect to Neon database")
    }

    if (!this.results.storage.localStorage && typeof window !== "undefined") {
      criticalIssues.push("WARNING: localStorage not available")
    }

    return criticalIssues
  }
}

// Make available globally for debugging
if (typeof window !== "undefined") {
  ;(window as any).__runDiagnostics = async () => {
    const diagnostics = new SystemDiagnostics()
    const results = await diagnostics.runAll()
    ;(window as any).__diagnostics = results
    return results
  }
}
