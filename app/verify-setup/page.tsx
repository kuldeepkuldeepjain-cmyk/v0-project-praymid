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
    { name: "Environment Variables", status: "pending", message: "Not tested yet" },
    { name: "Supabase Connection", status: "pending", message: "Not tested yet" },
    { name: "Database Tables", status: "pending", message: "Not tested yet" },
    { name: "API Routes", status: "pending", message: "Not tested yet" },
  ])
  const [running, setRunning] = useState(false)

  const runTests = async () => {
    setRunning(true)

    // Test 1: Environment Variables
    setTests(prev => prev.map((t, i) => i === 0 ? { ...t, status: "pending", message: "Checking..." } : t))
    
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (hasUrl && hasAnonKey) {
      setTests(prev => prev.map((t, i) => i === 0 ? { 
        ...t, 
        status: "success", 
        message: `✓ NEXT_PUBLIC_SUPABASE_URL and ANON_KEY found` 
      } : t))
    } else {
      setTests(prev => prev.map((t, i) => i === 0 ? { 
        ...t, 
        status: "error", 
        message: `✗ Missing: ${!hasUrl ? 'URL ' : ''}${!hasAnonKey ? 'ANON_KEY' : ''}` 
      } : t))
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 2: Supabase Connection
    setTests(prev => prev.map((t, i) => i === 1 ? { ...t, status: "pending", message: "Connecting..." } : t))
    
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { error } = await supabase.from("participants").select("count").limit(1)
      
      if (error) {
        setTests(prev => prev.map((t, i) => i === 1 ? { 
          ...t, 
          status: "error", 
          message: `✗ Connection failed: ${error.message}` 
        } : t))
        setRunning(false)
        return
      }
      
      setTests(prev => prev.map((t, i) => i === 1 ? { 
        ...t, 
        status: "success", 
        message: "✓ Connected to Supabase successfully" 
      } : t))
    } catch (error: any) {
      setTests(prev => prev.map((t, i) => i === 1 ? { 
        ...t, 
        status: "error", 
        message: `✗ Error: ${error.message}` 
      } : t))
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 3: Database Tables
    setTests(prev => prev.map((t, i) => i === 2 ? { ...t, status: "pending", message: "Checking tables..." } : t))
    
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const requiredTables = [
        "participants",
        "activity_logs",
        "support_tickets",
        "payment_submissions",
        "payout_requests"
      ]
      
      const missingTables = []
      
      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select("count").limit(1)
        if (error) {
          missingTables.push(table)
        }
      }
      
      if (missingTables.length > 0) {
        setTests(prev => prev.map((t, i) => i === 2 ? { 
          ...t, 
          status: "error", 
          message: `✗ Missing tables: ${missingTables.join(", ")}. Run NEW_DATABASE_SETUP.sql` 
        } : t))
        setRunning(false)
        return
      }
      
      setTests(prev => prev.map((t, i) => i === 2 ? { 
        ...t, 
        status: "success", 
        message: `✓ All ${requiredTables.length} required tables exist` 
      } : t))
    } catch (error: any) {
      setTests(prev => prev.map((t, i) => i === 2 ? { 
        ...t, 
        status: "error", 
        message: `✗ Error: ${error.message}` 
      } : t))
      setRunning(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    // Test 4: API Routes
    setTests(prev => prev.map((t, i) => i === 3 ? { ...t, status: "pending", message: "Testing APIs..." } : t))
    
    try {
      const healthResponse = await fetch("/api/health")
      const healthData = await healthResponse.json()
      
      if (!healthData.ok) {
        setTests(prev => prev.map((t, i) => i === 3 ? { 
          ...t, 
          status: "error", 
          message: "✗ API health check failed" 
        } : t))
        setRunning(false)
        return
      }
      
      setTests(prev => prev.map((t, i) => i === 3 ? { 
        ...t, 
        status: "success", 
        message: "✓ API routes are responding correctly" 
      } : t))
    } catch (error: any) {
      setTests(prev => prev.map((t, i) => i === 3 ? { 
        ...t, 
        status: "error", 
        message: `✗ Error: ${error.message}` 
      } : t))
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
          <p className="text-gray-600">Verify your new Supabase database is configured correctly</p>
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
                  ❌ Some tests failed. Please check FRESH_START_GUIDE.md for troubleshooting steps.
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
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Open Supabase Dashboard
            </a>
            <a
              href="/FRESH_START_GUIDE.md"
              className="block text-blue-600 hover:underline"
            >
              → View Setup Guide
            </a>
            <a
              href="/test-db"
              className="block text-blue-600 hover:underline"
            >
              → Advanced Database Tests
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
