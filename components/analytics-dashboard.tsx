"use client"
import { Users, TrendingUp, CheckCircle2, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react"
import type { DailyMetric, ConversionFunnel } from "@/lib/types"

interface AnalyticsDashboardProps {
  dailyMetrics: DailyMetric[]
  funnel: ConversionFunnel
  totalParticipants: number
  pendingPayments: number
  flaggedUsers: number
}

export function AnalyticsDashboard({
  dailyMetrics = [],
  funnel = { registered: 0, payment_submitted: 0, payment_approved: 0, active_participants: 0 },
  totalParticipants = 0,
  pendingPayments = 0,
  flaggedUsers = 0,
}: AnalyticsDashboardProps) {
  const safeMetrics = dailyMetrics && dailyMetrics.length > 0 ? dailyMetrics : []
  const todayMetrics =
    safeMetrics.length > 0
      ? safeMetrics[safeMetrics.length - 1]
      : { joins: 0, payments: 0, active: 0, date: new Date().toISOString() }
  const yesterdayMetrics = safeMetrics.length > 1 ? safeMetrics[safeMetrics.length - 2] : null

  const joinGrowth =
    yesterdayMetrics && yesterdayMetrics.joins > 0
      ? ((todayMetrics.joins - yesterdayMetrics.joins) / yesterdayMetrics.joins) * 100
      : 0

  const safeFunnel = funnel || { registered: 0, payment_submitted: 0, payment_approved: 0, active_participants: 0 }

  const approvalRate =
    safeFunnel.payment_submitted > 0
      ? ((safeFunnel.payment_approved / safeFunnel.payment_submitted) * 100).toFixed(1)
      : "0"

  const conversionRate =
    safeFunnel.registered > 0 ? ((safeFunnel.active_participants / safeFunnel.registered) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6 mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-2xl p-5 border-0 shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 group-hover:text-[#E85D3B] transition-colors">Daily Joins</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{todayMetrics?.joins || 0}</p>
              <div
                className={`flex items-center text-xs mt-1 ${joinGrowth >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}
              >
                {joinGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(joinGrowth).toFixed(1)}% vs yesterday
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border-0 shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 group-hover:text-[#10b981] transition-colors">Approval Rate</p>
              <p className="text-3xl font-bold text-[#10b981] mt-1">{approvalRate}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {safeFunnel.payment_approved}/{safeFunnel.payment_submitted} approved
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border-0 shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 group-hover:text-[#E85D3B] transition-colors">Conversion Rate</p>
              <p className="text-3xl font-bold text-[#E85D3B] mt-1">{conversionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Registration to Active</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border-0 shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 group-hover:text-[#f59e0b] transition-colors">Flagged Users</p>
              <p className="text-3xl font-bold text-[#f59e0b] mt-1">{flaggedUsers}</p>
              <p className="text-xs text-gray-400 mt-1">Requires review</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border-0 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100/50">
          <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
          <p className="text-sm text-gray-500">User journey from registration to active participation</p>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            {[
              { label: "Registered", value: safeFunnel.registered, color: "from-gray-400 to-gray-500" },
              { label: "Payment Submitted", value: safeFunnel.payment_submitted, color: "from-[#f59e0b] to-[#d97706]" },
              { label: "Payment Approved", value: safeFunnel.payment_approved, color: "from-[#E85D3B] to-[#f97316]" },
              {
                label: "Active Participants",
                value: safeFunnel.active_participants,
                color: "from-[#10b981] to-[#059669]",
              },
            ].map((step, i) => {
              const percentage = safeFunnel.registered > 0 ? (step.value / safeFunnel.registered) * 100 : 0
              return (
                <div key={step.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{step.label}</span>
                    <span className="font-semibold text-gray-900">
                      {step.value} <span className="text-gray-400 font-normal">({percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${step.color} transition-all duration-700 ease-out rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border-0 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100/50">
          <h3 className="text-lg font-semibold text-gray-900">7-Day Activity</h3>
          <p className="text-sm text-gray-500">Daily platform metrics overview</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-3">
            {(safeMetrics.length > 0
              ? safeMetrics.slice(-7)
              : Array.from({ length: 7 }, (_, i) => ({
                  date: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
                  joins: 0,
                  payments: 0,
                  active: 0,
                }))
            ).map((metric, i) => (
              <div key={metric.date || i} className="text-center group">
                <div className="space-y-1 mb-2 flex flex-col items-center">
                  <div
                    className="w-10 bg-gradient-to-t from-[#E85D3B] to-[#f97316] rounded-lg transition-all duration-300 group-hover:scale-110"
                    style={{ height: `${Math.max(24, (metric.joins || 0) * 10)}px` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(metric.date).toLocaleDateString("en", { weekday: "short" })}
                </p>
                <p className="text-sm font-semibold text-gray-900">{metric.joins || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
