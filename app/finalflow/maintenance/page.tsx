"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function AdminMaintenancePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const handleCheckErrors = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/admin/check-data-errors")
      const data = await res.json()
      setResult({ type: "check", data })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check errors")
    } finally {
      setLoading(false)
    }
  }

  const handleFixErrors = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/admin/fix-data-errors", { method: "POST" })
      const data = await res.json()
      setResult({ type: "fix", data })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fix errors")
    } finally {
      setLoading(false)
    }
  }

  const handleCloseOldBets = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/admin/close-old-bets", { method: "POST" })
      const data = await res.json()
      setResult({ type: "closeBets", data })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close old bets")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-slate-900">Database Maintenance</h1>
        <p className="text-slate-600 mb-6">Check and fix database errors, close expired bets</p>

        <div className="grid gap-4 mb-8">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Check Data Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Scan database for consistency errors and issues</p>
              <Button onClick={handleCheckErrors} disabled={loading} size="lg" className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Check Database Health
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Fix Data Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Automatically repair missing fields, null values, and invalid states</p>
              <Button onClick={handleFixErrors} disabled={loading} size="lg" variant="default" className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Fix All Errors
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Close Old Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">Close and refund all expired or old pending predictions</p>
              <Button onClick={handleCloseOldBets} disabled={loading} size="lg" variant="secondary" className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Close Old Bets
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>
                {result.type === "check"
                  ? "Database Health Check Results"
                  : result.type === "fix"
                  ? "Fixes Applied"
                  : "Old Bets Closed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.type === "check" && (
                  <>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="font-semibold text-slate-900 mb-2">Summary</p>
                      <p className="text-sm text-slate-600">
                        Errors: <span className="font-bold text-red-600">{result.data.summary.totalErrors}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Warnings: <span className="font-bold text-orange-600">{result.data.summary.totalWarnings}</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-2">
                        Status:{" "}
                        <span
                          className={`font-bold ${result.data.summary.allTablesHealthy ? "text-green-600" : "text-red-600"}`}
                        >
                          {result.data.summary.allTablesHealthy ? "All Healthy ✓" : "Issues Found"}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      {result.data.details.map((detail: any) => (
                        <div key={detail.table} className="bg-slate-50 p-3 rounded-lg">
                          <p className="font-semibold text-slate-900">{detail.table}</p>
                          <p className="text-sm text-slate-600">Total Records: {detail.totalRecords}</p>
                          {detail.errors.length > 0 && (
                            <div className="text-red-600 text-sm mt-1">
                              {detail.errors.map((err: string) => (
                                <p key={err}>❌ {err}</p>
                              ))}
                            </div>
                          )}
                          {detail.warnings.length > 0 && (
                            <div className="text-orange-600 text-sm mt-1">
                              {detail.warnings.map((warn: string) => (
                                <p key={warn}>⚠️ {warn}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {result.type === "fix" && (
                  <div className="space-y-2">
                    {result.data.fixesApplied.map((fix: any) => (
                      <div key={fix.issue} className="bg-slate-50 p-3 rounded-lg">
                        <p className="font-semibold text-slate-900">{fix.issue}</p>
                        <p className="text-sm text-green-600">✓ Fixed: {fix.fixed} records</p>
                        {fix.error && <p className="text-sm text-red-600">Error: {fix.error}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {result.type === "closeBets" && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="font-semibold text-slate-900 mb-2">Operation Complete</p>
                    <p className="text-sm text-slate-600">Closed: {result.data.closedCount} bets</p>
                    <p className="text-sm text-slate-600">Attempted: {result.data.totalAttempted} bets</p>
                    {result.data.errors.length > 0 && (
                      <div className="text-red-600 text-sm mt-2">
                        <p className="font-semibold">Errors:</p>
                        {result.data.errors.map((err: any) => (
                          <p key={err.betId}>{err.betId}: {err.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-4">{result.data.timestamp}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
