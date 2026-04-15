"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, AlertTriangle, LogIn, Settings, Activity, UserPlus, CreditCard } from "lucide-react"
import type { AuditLog } from "@/lib/types"

interface ActivityFeedProps {
  activities: AuditLog[]
  maxHeight?: string
}

export function ActivityFeed({ activities, maxHeight = "400px" }: ActivityFeedProps) {
  const getActivityIcon = (action: AuditLog["action"]) => {
    switch (action) {
      case "login":
        return LogIn
      case "approve_payment":
        return CheckCircle2
      case "reject_payment":
        return XCircle
      case "flag_user":
        return AlertTriangle
      case "update_status":
        return Settings
      case "admin_action":
        return Settings
      case "new_registration":
        return UserPlus
      case "payment_submitted":
        return CreditCard
      default:
        return Activity
    }
  }

  const getActivityStyle = (action: AuditLog["action"]) => {
    switch (action) {
      case "approve_payment":
        return { icon: "text-[#10b981]", bg: "bg-[#10b981]/10" }
      case "reject_payment":
        return { icon: "text-red-500", bg: "bg-red-500/10" }
      case "flag_user":
        return { icon: "text-amber-500", bg: "bg-amber-500/10" }
      case "new_registration":
        return { icon: "text-[#7c3aed]", bg: "bg-[#7c3aed]/10" }
      case "payment_submitted":
        return { icon: "text-[#E85D3B]", bg: "bg-[#E85D3B]/10" }
      case "login":
        return { icon: "text-[#22d3ee]", bg: "bg-[#22d3ee]/10" }
      default:
        return { icon: "text-gray-600", bg: "bg-gray-100" }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="glass rounded-2xl border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-[#E85D3B]/5 to-[#f97316]/5">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center shadow-md">
            <Activity className="h-4 w-4 text-white" />
          </div>
          Real-time Activity
        </CardTitle>
        <CardDescription className="text-gray-500">Platform events and admin actions</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-1 p-2">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">No recent activity</p>
                <p className="text-sm mt-1">Activity will appear here</p>
              </div>
            ) : (
              activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.action)
                const style = getActivityStyle(activity.action)
                return (
                  <div
                    key={activity.id}
                    className="p-3 hover:bg-white/80 rounded-xl transition-all duration-300 cursor-pointer group animate-slide-up-fade"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl ${style.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className={`h-4 w-4 ${style.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold text-gray-900">{activity.actor_email}</span>{" "}
                          <span className="text-gray-600">{activity.details}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(activity.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
