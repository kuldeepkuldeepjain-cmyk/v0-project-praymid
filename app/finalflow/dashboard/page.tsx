"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  LayoutDashboard,
  Users,
  Coins,
  BarChart3,
  Database,
  MessageSquare,
  Activity,
  Shield,
  Bell,
  Search,
  UserPlus,
  RefreshCw,
  LogOut,
  Settings,
  Loader2,
  TrendingUp,
  Crown,
  Sparkles,
  Send,
  ArrowRight,
  Trash2,
  Wallet,
  ShieldCheck,
  Key,
} from "lucide-react"
import { isAdminAuthenticated, getAdminData, clearAdminAuth, adminFetch } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ParticipantDatabaseView } from "@/components/admin/participant-database-view"
import { OverviewAnalytics } from "@/components/admin/overview-analytics"
import { ComprehensiveDatabaseView } from "@/components/admin/comprehensive-database-view"
import { SendNotificationPanel } from "@/components/admin/send-notification-panel"
import { P2PContributionPanel } from "@/components/admin/p2p-contribution-panel"
import { P2PPayoutQueuePanel } from "@/components/admin/p2p-payout-queue-panel"
import { PlatformRevenueTracker } from "@/components/admin/platform-revenue-tracker"
import { UserLedgerView } from "@/components/admin/user-ledger-view"
import { AllParticipantsLedger } from "@/components/admin/all-participants-ledger"
import { DeleteParticipantsPanel } from "@/components/admin/delete-participants-panel"
import { P2PModeTogglePanel } from "@/components/admin/p2p-mode-toggle-panel"
import { TopUpRequestsPanel } from "@/components/admin/topup-requests-panel"
import { OtpApprovalsPanel } from "@/components/admin/otp-approvals-panel"
import { PasswordResetOTPsPanel } from "@/components/admin/password-reset-otps-panel"
import Loading from "./loading"
import { ErrorBoundary } from "@/components/error-boundary"

interface NavItem {
  id: string
  label: string
  icon: any
  section: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeView, setActiveView] = useState("overview")
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pendingOtpCount, setPendingOtpCount] = useState(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const verifyAdminAccess = () => {
      try {
        if (!isAdminAuthenticated()) {
          router.push("/finalflow/login")
          return
        }

        const adminData = getAdminData()
        if (!adminData?.email) {
          router.push("/finalflow/login")
          return
        }

        setAdminEmail(adminData.email)
        setIsLoading(false)
      } catch {
        router.push("/finalflow/login")
      }
    }

    verifyAdminAccess()
  }, [router])

  useEffect(() => {
    const fetchOtpCount = async () => {
      try {
        const res = await adminFetch("/api/admin/pending-otp-approvals")
        if (!res.ok) return
        const data = await res.json()
        if (data.success) setPendingOtpCount(data.count || 0)
      } catch {}
    }
    fetchOtpCount()
    const interval = setInterval(fetchOtpCount, 20000)
    return () => clearInterval(interval)
  }, [])

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, section: "MAIN MENU" },
    { id: "participants", label: "Participants", icon: Users, section: "MAIN MENU" },
    { id: "p2p-contributions", label: "P2P Contributions", icon: Coins, section: "MAIN MENU" },
    { id: "p2p-payout-queue", label: "P2P Payout Queue", icon: UserPlus, section: "MAIN MENU" },
    { id: "revenue-tracker", label: "Revenue Tracker", icon: TrendingUp, section: "MAIN MENU" },
    { id: "all-ledger", label: "All Participants Ledger", icon: Database, section: "MAIN MENU" },
    { id: "user-ledger", label: "Single User Ledger", icon: Database, section: "MAIN MENU" },
    { id: "otp-approvals", label: "OTP Approvals", icon: ShieldCheck, section: "MANAGEMENT" },
    { id: "password-reset-otps", label: "Password Reset OTPs", icon: Key, section: "MANAGEMENT" },
    { id: "database", label: "Database", icon: Database, section: "MANAGEMENT" },
    { id: "topup-requests", label: "TOP UP Requests", icon: Wallet, section: "MANAGEMENT" },
    { id: "delete-participants", label: "Delete Participants", icon: Trash2, section: "MANAGEMENT" },
    { id: "send-notifications", label: "Send Notifications", icon: Bell, section: "SYSTEM" },
    { id: "p2p-settings", label: "P2P Mode Toggle", icon: Settings, section: "SYSTEM" },
  ]

  const handleLogout = () => {
    try {
      clearAdminAuth()
      router.push("/finalflow/login")
    } catch {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" })
    }
  }

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <OverviewAnalytics />
      case "participants":
        return <ParticipantDatabaseView />
      case "p2p-contributions":
        return <P2PContributionPanel />
      case "p2p-payout-queue":
        return <P2PPayoutQueuePanel />
      case "database":
        return <ComprehensiveDatabaseView />
      case "topup-requests":
        return <TopUpRequestsPanel />
      case "revenue-tracker":
        return <PlatformRevenueTracker />
      case "all-ledger":
        return <AllParticipantsLedger />
      case "user-ledger":
        return <UserLedgerView />
      case "delete-participants":
        return <DeleteParticipantsPanel />
      case "send-notifications":
        return <SendNotificationPanel />
      case "otp-approvals":
        return <OtpApprovalsPanel />
      case "password-reset-otps":
        return <PasswordResetOTPsPanel />
      case "p2p-settings":
        return <P2PModeTogglePanel />
      default:
        return <OverviewAnalytics />
    }
  }

  if (isLoading) {
    return <Loading />
  }

  const groupedNavItems = navItems.reduce((acc, item) => {
    const existing = acc.find(g => g.section === item.section)
    if (existing) {
      existing.items.push(item)
    } else {
      acc.push({ section: item.section, items: [item] })
    }
    return acc
  }, [] as Array<{ section: string; items: NavItem[] }>)

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:top-0 w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto transition-transform duration-300 z-50`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold text-cyan-500 mb-8">Admin Panel</h1>

          {groupedNavItems.map(group => (
            <div key={group.section} className="mb-8">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                {group.section}
              </p>
              <nav className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      if (isMobile) setSidebarOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      activeView === item.id
                        ? "bg-cyan-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.id === "otp-approvals" && pendingOtpCount > 0 && (
                      <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                        {pendingOtpCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {navItems.find(item => item.id === activeView)?.label || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{adminEmail}</span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <ErrorBoundary key={activeView} fallback={
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <p className="text-slate-400 text-sm">This panel encountered an error. Please try refreshing.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
              >
                Reload Dashboard
              </button>
            </div>
          }>
            {renderView()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
