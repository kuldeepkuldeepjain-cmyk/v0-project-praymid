'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react'

interface AutomatchMetrics {
  status: string
  timestamp: string
  metrics: {
    pendingEligible: number
    recentlyMatched: number
    availablePayouts: number
    matchRate: number
    system_health: 'healthy' | 'warning' | 'critical'
  }
  recentMatches: Array<{
    contributionId: string
    amount: number
    matchedAt: string
    participantEmail: string
  }>
  recommendations: string[]
}

export function AutomatchStatusDashboard({ cronSecret }: { cronSecret: string }) {
  const [metrics, setMetrics] = useState<AutomatchMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/admin/automatch/status?token=${encodeURIComponent(cronSecret)}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }

      const data = await response.json()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [cronSecret])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Dashboard Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return null
  }

  const healthColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  }

  const healthIcons = {
    healthy: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    warning: <Clock className="h-5 w-5 text-yellow-600" />,
    critical: <AlertCircle className="h-5 w-5 text-red-600" />,
  }

  return (
    <div className="space-y-4">
      {/* System Status Header */}
      <Card className={`border-2 ${healthColors[metrics.metrics.system_health]}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {healthIcons[metrics.metrics.system_health]}
              <div>
                <p className="font-semibold capitalize">
                  System Status: {metrics.metrics.system_health}
                </p>
                <p className="text-sm opacity-75">
                  Last updated: {lastUpdated?.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              className="px-3 py-1 text-sm font-medium bg-white rounded hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Eligible */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Eligible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.metrics.pendingEligible}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ready for automatch
            </p>
          </CardContent>
        </Card>

        {/* Recently Matched */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recently Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.metrics.recentlyMatched}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              In last 5 minutes
            </p>
          </CardContent>
        </Card>

        {/* Available Payouts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Available Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.metrics.availablePayouts}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Waiting to match
            </p>
          </CardContent>
        </Card>

        {/* Match Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Match Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.metrics.matchRate}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      {metrics.recentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentMatches.slice(0, 5).map((match) => (
                <div key={match.contributionId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">
                      ${match.amount}
                    </p>
                    <p className="text-xs text-slate-500">
                      {match.participantEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(match.matchedAt).toLocaleTimeString()}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      Matched
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-amber-900">
                  <span className="text-amber-600">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
