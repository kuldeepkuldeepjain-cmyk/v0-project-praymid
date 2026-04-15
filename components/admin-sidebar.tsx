"use client"

import React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FlowChainLogoCompact } from "@/components/flowchain-logo"
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  ImageIcon,
  AlertTriangle,
  Activity,
  MessageSquare,
  Wallet,
  Database,
  Crown,
  TrendingUp,
  UserPlus,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { clearAdminAuth, getAdminData } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

type AdminSidebarProps = {
  activeTab: string
  onTabChange: (tab: string) => void
  pendingPayments?: number
  flaggedUsers?: number
}

const mainMenuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, badge: null },
  { id: "participants", label: "Participants", icon: Users, badge: null },
  { id: "payments", label: "Contributions", icon: ImageIcon, badge: null, highlight: true },
  { id: "analytics", label: "Advanced Analytics", icon: TrendingUp, badge: null },
  { id: "payout-tracker", label: "Payout Tracker", icon: TrendingUp, badge: null },
]

const managementItems = [
  { id: "database", label: "Database", icon: Database, badge: null, superAdminOnly: true },
  { id: "risk-engine", label: "Risk Engine", icon: AlertTriangle, badge: null, isRisk: true },
  { id: "support", label: "Support Tickets", icon: MessageSquare, badge: null },
  { id: "approved-wallets", label: "Approved Wallets", icon: Wallet, badge: null, superAdminOnly: true },
  { id: "activity-log", label: "Activity Log", icon: Activity, badge: null, superAdminOnly: true },
  { id: "admins", label: "Admin Users", icon: Shield, badge: null, superAdminOnly: true },
]

const systemItems = [
  { id: "notifications", label: "Notifications", icon: Bell, badge: "3" },
  { id: "settings", label: "Settings", icon: Settings, badge: null },
]

export function AdminSidebar({ activeTab, onTabChange, pendingPayments = 0, flaggedUsers = 0 }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [adminData, setAdminData] = useState<{ email: string; role: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const data = getAdminData()
    setAdminData(data)
  }, [])

  const handleLogout = () => {
    clearAdminAuth()
    router.push("/admin/login")
  }

  const renderMenuItem = (item: {
    id: string
    label: string
    icon: React.ElementType
    badge: string | null
    highlight?: boolean
    isRisk?: boolean
    superAdminOnly?: boolean
  }) => {
    const isSuperAdminItem = item.superAdminOnly
    const userIsSuperAdmin = adminData?.role === "super_admin"
    const Icon = item.icon

    return (
      <Button
        key={item.id}
        variant={activeTab === item.id ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-10 relative text-gray-600 hover:text-[#E85D3B] hover:bg-gray-100 rounded-xl transition-all duration-200 gap-3",
          collapsed && "justify-center px-2",
          activeTab === item.id && "bg-[#E85D3B]/10 text-[#E85D3B] hover:bg-[#E85D3B]/15 border-l-2 border-[#E85D3B]",
          item.id === "payments" &&
            pendingPayments > 0 &&
            activeTab !== "payments" &&
            "bg-amber-50 text-amber-600 hover:bg-amber-100 border-l-2 border-amber-500",
          item.isRisk &&
            flaggedUsers > 0 &&
            activeTab !== "risk-engine" &&
            "bg-red-50 text-red-600 hover:bg-red-100 border-l-2 border-red-500",
          isSuperAdminItem && userIsSuperAdmin && "border-l-2 border-gray-400",
        )}
        onClick={() => {
          if (item.id === "settings") {
            router.push("/admin/dashboard/settings")
          } else {
            onTabChange(item.id)
          }
        }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <React.Fragment>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.id === "payments" && pendingPayments > 0 ? (
              <Badge variant="secondary" className="h-5 px-2 text-xs bg-amber-500 text-white border-0 font-semibold">
                {pendingPayments}
              </Badge>
            ) : item.id === "risk-engine" && flaggedUsers > 0 ? (
              <Badge variant="secondary" className="h-5 px-2 text-xs bg-red-500 text-white border-0 font-semibold">
                {flaggedUsers}
              </Badge>
            ) : isSuperAdminItem && userIsSuperAdmin ? (
              <Crown className="h-3 w-3 text-gray-500" />
            ) : item.badge ? (
              <Badge variant="secondary" className="h-5 px-2 text-xs bg-gray-200 text-gray-700 border-0">
                {item.badge}
              </Badge>
            ) : null}
          </React.Fragment>
        )}
        {collapsed && item.id === "payments" && pendingPayments > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        )}
        {collapsed && item.id === "risk-engine" && flaggedUsers > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "relative flex flex-col glass border-r-0 shadow-xl transition-all duration-300 z-20 overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#E85D3B]/10 via-[#7c3aed]/5 to-[#22d3ee]/10" />
      <div className="absolute inset-0 mesh-gradient-light opacity-80" />

      <div className="absolute top-10 -left-10 w-60 h-60 bg-gradient-to-br from-[#E85D3B]/30 to-[#f97316]/25 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/3 -right-20 w-48 h-48 bg-gradient-to-br from-[#7c3aed]/25 to-[#a78bfa]/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute bottom-1/3 -left-10 w-40 h-40 bg-gradient-to-br from-[#22d3ee]/25 to-[#06b6d4]/20 rounded-full blur-2xl animate-float-slow" />
      <div
        className="absolute bottom-20 right-0 w-32 h-32 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/15 rounded-full blur-2xl animate-float"
        style={{ animationDelay: "3s" }}
      />

      <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-[#E85D3B] to-[#f97316] relative z-10">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <FlowChainLogoCompact size="sm" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide">FLOWCHAIN</span>
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-white/80" />
                <p className="text-xs text-white/80 font-medium">Admin Panel</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm mx-auto">
            <FlowChainLogoCompact size="sm" />
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute -right-3 top-20 h-6 w-6 rounded-full bg-white shadow-lg z-10 hover:bg-gray-50 text-gray-600 transition-all duration-200 border border-gray-200",
          collapsed && "justify-center px-2",
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <ScrollArea className="flex-1 py-4 bg-gradient-to-b from-white/30 to-white/20 backdrop-blur-md relative z-10">
        <div className="space-y-6 px-3">
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-[#E85D3B] uppercase tracking-wider mb-2">Main Menu</p>
            )}
            {mainMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-11 relative text-gray-700 hover:text-[#E85D3B] hover:bg-gradient-to-r hover:from-[#E85D3B]/15 hover:to-[#f97316]/10 rounded-xl transition-all duration-300 gap-3 group hover:scale-[1.02] hover:shadow-md",
                    collapsed && "justify-center px-2",
                    activeTab === item.id &&
                      "bg-gradient-to-r from-[#E85D3B]/20 to-[#f97316]/15 text-[#E85D3B] shadow-md scale-[1.02] border-l-3 border-[#E85D3B]",
                    item.id === "payments" &&
                      pendingPayments > 0 &&
                      activeTab !== "payments" &&
                      "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-600 hover:from-amber-200 hover:to-amber-100",
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-300 group-hover:scale-110",
                      activeTab === item.id && "scale-110 drop-shadow-sm",
                    )}
                  />
                  {!collapsed && (
                    <React.Fragment>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.id === "payments" && pendingPayments > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md animate-pulse">
                          {pendingPayments}
                        </Badge>
                      )}
                    </React.Fragment>
                  )}
                </Button>
              )
            })}
          </div>

          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-[#7c3aed] uppercase tracking-wider mb-2 flex items-center gap-2">
                Management
                <Crown className="h-3 w-3 text-[#E85D3B]" />
              </p>
            )}
            {managementItems.map((item) => {
              const Icon = item.icon
              const isSuperAdminItem = item.superAdminOnly
              const userIsSuperAdmin = adminData?.role === "super_admin"
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-11 relative text-gray-700 hover:text-[#7c3aed] hover:bg-gradient-to-r hover:from-[#7c3aed]/15 hover:to-[#a78bfa]/10 rounded-xl transition-all duration-300 gap-3 group hover:scale-[1.02] hover:shadow-md",
                    collapsed && "justify-center px-2",
                    activeTab === item.id &&
                      "bg-gradient-to-r from-[#7c3aed]/20 to-[#a78bfa]/15 text-[#7c3aed] shadow-md scale-[1.02] border-l-3 border-[#7c3aed]",
                    item.isRisk &&
                      flaggedUsers > 0 &&
                      activeTab !== "risk-engine" &&
                      "bg-gradient-to-r from-red-100 to-red-50 text-red-600 hover:from-red-200 hover:to-red-100",
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-300 group-hover:scale-110",
                      activeTab === item.id && "scale-110 drop-shadow-sm",
                    )}
                  />
                  {!collapsed && (
                    <React.Fragment>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.isRisk && flaggedUsers > 0 && (
                        <Badge className="h-5 px-2 text-xs bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-md animate-pulse">
                          {flaggedUsers}
                        </Badge>
                      )}
                      {isSuperAdminItem && userIsSuperAdmin && <Crown className="h-3 w-3 text-[#E85D3B]" />}
                    </React.Fragment>
                  )}
                </Button>
              )
            })}
          </div>

          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-[#22d3ee] uppercase tracking-wider mb-2">System</p>
            )}
            {systemItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-11 relative text-gray-700 hover:text-[#22d3ee] hover:bg-gradient-to-r hover:from-[#22d3ee]/15 hover:to-[#06b6d4]/10 rounded-xl transition-all duration-300 gap-3 group hover:scale-[1.02] hover:shadow-md",
                    collapsed && "justify-center px-2",
                    activeTab === item.id &&
                      "bg-gradient-to-r from-[#22d3ee]/20 to-[#06b6d4]/15 text-[#22d3ee] shadow-md scale-[1.02] border-l-3 border-[#22d3ee]",
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-300 group-hover:scale-110",
                      activeTab === item.id && "scale-110 drop-shadow-sm",
                    )}
                  />
                  {!collapsed && (
                    <React.Fragment>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge className="h-5 px-2 text-xs bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] text-white border-0 shadow-md">
                          {item.badge}
                        </Badge>
                      )}
                    </React.Fragment>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 bg-gradient-to-t from-white/50 to-white/30 backdrop-blur-md relative z-10">
        {!collapsed && adminData && (
          <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-[#E85D3B]/10 via-[#7c3aed]/5 to-[#22d3ee]/10 border border-white/50 shadow-sm">
            <p className="text-xs font-semibold text-gray-900 truncate">{adminData.email}</p>
            <p className="text-xs text-[#E85D3B] capitalize flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3" />
              {adminData.role?.replace("_", " ")}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-10 text-gray-600 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-100 hover:to-red-50 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md",
            collapsed && "justify-center px-2",
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  )
}
