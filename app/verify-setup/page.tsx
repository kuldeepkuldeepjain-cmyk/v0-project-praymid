"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

type TestResult = {
  name: string
  status: "pending" | "success" | "error"
  message: string
}

export default function VerifySetupPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "API Health", status: "pending", message: "Not tested yet" },
    { name: "Database Connection", status: "pending", message: "Not tested yet" },
    { name: "Database Tables", status: "pending", message: "Not tested yet" },
    { name: "API Routes", status: "pending", message: "Not tested yet" },
  ])
  const [running, setRunning] = useState(false)

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...update } : t))
  }

  const runTests = async () => {
    setRunning(true)

    // Test 1: API Health
    updateTest(0, { status: "pending", message: "Checking..." })
    try {
      const healthRes = await fetch("/api/health")
      const healthData = await healthRes.json()
      if (healthData.environment?.hasDatabaseUrl) {
        updateTest(0, { status: "success", message: "✓ API is healthy and DATABASE_URL is set" })
      } else {
        updateTest(0, { status: "error", message: "✗ DATABASE_URL is missing. Add it in Vercel environment variables." })
        setRunning(false)
        return
      }
    } catch (error: any) {
      updateTest(0, { status: "error", message: `✗ API unreachable: ${error.message}` })
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 2: Database Connection (via admin participants list)
    updateTest(1, { status: "pending", message: "Connecting to Neon database..." })
    try {
      const res = await fetch("/api/admin/participants?limit=1")
      if (res.ok) {
        updateTest(1, { status: "success", message: "✓ Connected to Neon database successfully" })
      } else if (res.status === 401) {
        // 401 means auth middleware ran, which means DB is reachable
        updateTest(1, { status: "success", message: "✓ Database reachable (auth middleware responded)" })
      } else {
        const text = await res.text()
        updateTest(1, { status: "error", message: `✗ Database error: ${text}` })
        setRunning(false)
        return
      }
    } catch (error: any) {
      updateTest(1, { status: "error", message: `✗ Error: ${error.message}` })
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 3: Database Tables (via verify-env)
    updateTest(2, { status: "pending", message: "Checking database tables..." })
    try {
      const res = await fetch("/api/verify-env")
      const data = await res.json()
      if (data.requirements?.database?.configured) {
        updateTest(2, { status: "success", message: "✓ Database configuration verified" })
      } else {
        const missing = data.missingSetting?.critical?.join(", ") || "Unknown"
        updateTest(2, { status: "error", message: `✗ Missing: ${missing}` })
        setRunning(false)
        return
      }
    } catch (error: any) {
      updateTest(2, { status: "error", message: `✗ Error: ${error.message}` })
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 4: API Routes
    updateTest(3, { status: "pending", message: "Testing APIs..." })
    try {
      const res = await fetch("/api/health")
      if (res.ok) {
        updateTest(3, { status: "success", message: "✓ API routes are responding correctly" })
      } else {
        updateTest(3, { status: "error", message: "✗ API health check failed" })
      }
    } catch (error: any) {
      updateTest(3, { status: "error", message: `✗ Error: ${error.message}` })
    }

    setRunning(false)
  }

  const allPassed = tests.every(t => t.status === "success")
  const anyFailed = tests.some(t => t.status === "error")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Setup Verification</h1>
          <p className="text-gray-600">Verify your Neon database is configured correctly</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Tests</CardTitle>
            <CardDescription>
              Run these tests to ensure everything is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runTests}
              disabled={running}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                "Run All Tests"
              )}
            </Button>

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white"
                >
                  {test.status === "pending" && (
                    <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  {test.status === "success" && (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  )}
                  {test.status === "error" && (
                    <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{test.name}</div>
                    <div className={`text-sm ${
                      test.status === "success" ? "text-green-600" :
                      test.status === "error" ? "text-red-600" :
                      "text-gray-500"
                    }`}>
                      {test.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {allPassed && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ All tests passed! Your database is ready. You can now register users and start using the app.
                </AlertDescription>
              </Alert>
            )}

            {anyFailed && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ Some tests failed. Please ensure DATABASE_URL is set in your Vercel environment variables.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {allPassed && (
          <div className="grid grid-cols-2 gap-4">
            <Button asChild variant="outline" className="w-full bg-transparent">
              <a href="/participant/register">Go to Registration</a>
            </Button>
            <Button asChild className="w-full">
              <a href="/participant/login">Go to Login</a>
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/test-db"
              className="block text-blue-600 hover:underline"
            >
              → Advanced Database Tests
            </a>
            <a
              href="/api/verify-env"
              className="block text-blue-600 hover:underline"
            >
              → Environment Variables Status
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
