"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export default function DatabaseTestPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const testResults: any = {
      envVars: {},
      apiHealth: {},
      database: {},
      adminAuth: {}
    }

    // Test 1: Environment Variables (check via health API - env vars not exposed client-side)
    console.log("[TEST] Checking environment variables...")
    try {
      const healthRes = await fetch("/api/health")
      const healthData = await healthRes.json()
      testResults.envVars.hasDatabaseUrl = healthData.environment?.hasDatabaseUrl === true
    } catch {
      testResults.envVars.hasDatabaseUrl = false
    }

    // Test 2: Health Endpoint
    console.log("[TEST] Checking health endpoint...")
    try {
      const healthRes = await fetch("/api/health")
      testResults.apiHealth.status = healthRes.status
      testResults.apiHealth.ok = healthRes.ok
      const healthData = await healthRes.json()
      testResults.apiHealth.data = healthData
    } catch (error: any) {
      testResults.apiHealth.error = error.message
    }

    // Test 3: Database Query (via participants API)
    console.log("[TEST] Testing database query...")
    try {
      const dbRes = await fetch("/api/admin/participants")
      testResults.database.status = dbRes.status
      testResults.database.ok = dbRes.ok

      if (dbRes.ok) {
        const dbData = await dbRes.json()
        testResults.database.participantCount = dbData.participants?.length || 0
        testResults.database.sample = dbData.participants?.slice(0, 3).map((p: any) => ({
          username: p.username,
          email: p.email,
          created: new Date(p.created_at).toLocaleString()
        }))
      } else {
        const errorText = await dbRes.text()
        testResults.database.error = errorText
      }
    } catch (error: any) {
      testResults.database.error = error.message
    }

    // Test 4: Admin Authentication
    console.log("[TEST] Testing admin authentication...")
    try {
      const adminRes = await fetch("/api/auth/secure-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@123",
          otp: "111111",
          loginType: "admin"
        })
      })
      testResults.adminAuth.status = adminRes.status
      testResults.adminAuth.ok = adminRes.ok

      if (adminRes.ok) {
        const authData = await adminRes.json()
        testResults.adminAuth.success = authData.success
        testResults.adminAuth.role = authData.role
      } else {
        const errorText = await adminRes.text()
        testResults.adminAuth.error = errorText
      }
    } catch (error: any) {
      testResults.adminAuth.error = error.message
    }

    console.log("[TEST] All tests complete:", testResults)
    setResults(testResults)
    setLoading(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  const StatusIcon = ({ success }: { success: boolean }) =>
    success ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Database Connection Test</h1>
          <p className="text-muted-foreground">
            Verify your Neon backend is working correctly
          </p>
        </div>

        <Button onClick={runTests} disabled={loading} className="w-full">
          {loading ? "Running Tests..." : "Run Tests Again"}
        </Button>

        {results && (
          <div className="space-y-4">
            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon success={results.envVars.hasDatabaseUrl} />
                  Environment Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">DATABASE_URL:</span>
                  <StatusIcon success={results.envVars.hasDatabaseUrl} />
                </div>
                {!results.envVars.hasDatabaseUrl && (
                  <p className="text-xs text-red-500 mt-2">
                    DATABASE_URL is missing. Add it in Vercel environment variables.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Health Endpoint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon success={results.apiHealth.ok} />
                  API Health Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <span className="text-sm font-mono">{results.apiHealth.status}</span>
                </div>
                {results.apiHealth.data && (
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto">
                    {JSON.stringify(results.apiHealth.data, null, 2)}
                  </pre>
                )}
                {results.apiHealth.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {results.apiHealth.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon success={results.database.ok} />
                  Database Query
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <span className="text-sm font-mono">{results.database.status}</span>
                </div>
                {results.database.participantCount !== undefined && (
                  <div className="text-sm">
                    <strong>Participants Found:</strong> {results.database.participantCount}
                  </div>
                )}
                {results.database.sample && results.database.sample.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">Sample Participants:</p>
                    {results.database.sample.map((p: any, i: number) => (
                      <div key={i} className="text-xs bg-slate-100 p-2 rounded mb-1">
                        <div><strong>Username:</strong> {p.username}</div>
                        <div><strong>Email:</strong> {p.email}</div>
                        <div><strong>Created:</strong> {p.created}</div>
                      </div>
                    ))}
                  </div>
                )}
                {results.database.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {results.database.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon success={results.adminAuth.ok} />
                  Admin Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <span className="text-sm font-mono">{results.adminAuth.status}</span>
                </div>
                {results.adminAuth.success && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    ✓ Admin login working (Role: {results.adminAuth.role})
                  </div>
                )}
                {results.adminAuth.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {results.adminAuth.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overall Status */}
            <Card className={
              results.envVars.hasDatabaseUrl &&
              results.apiHealth.ok &&
              results.database.ok &&
              results.adminAuth.ok
                ? "border-green-500"
                : "border-red-500"
            }>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {results.envVars.hasDatabaseUrl &&
                   results.apiHealth.ok &&
                   results.database.ok &&
                   results.adminAuth.ok ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      All Systems Operational
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Issues Detected
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.envVars.hasDatabaseUrl &&
                 results.apiHealth.ok &&
                 results.database.ok &&
                 results.adminAuth.ok ? (
                  <p className="text-sm text-green-600">
                    Your Neon backend is fully operational! All authentication and database operations are working correctly.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-semibold">
                      Some systems are not working. Common fixes:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {!results.envVars.hasDatabaseUrl && (
                        <li>Set DATABASE_URL in Vercel environment variables</li>
                      )}
                      {!results.apiHealth.ok && (
                        <li>Check Vercel runtime logs for API errors</li>
                      )}
                      {!results.database.ok && (
                        <li>Verify DATABASE_URL is correct and Neon database is accessible</li>
                      )}
                      {!results.adminAuth.ok && (
                        <li>Check admin credentials in /api/auth/secure-login</li>
                      )}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-4">
                      After making changes, redeploy your app for them to take effect.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
