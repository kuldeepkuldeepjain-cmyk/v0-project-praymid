"use client"

import { useState } from "react"
import {
  Search,
  Bell,
  ChevronDown,
  Settings,
  HelpCircle,
  Globe,
  Activity,
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  BarChart3,
  LineChart,
  Newspaper,
  Calendar,
  Calculator,
  Briefcase,
  PieChart,
  GraduationCap,
  Headphones,
  LogOut,
  User,
  CreditCard,
  Shield,
  Zap,
  Eye,
  EyeOff,
  Plus,
  Star,
  Crown,
  CircleDot,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  Hash,
  Volume2,
  VolumeX,
  Mail,
  MessageSquare,
  Bookmark,
  History,
  Target,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Languages,
  Palette,
  Keyboard,
  Bot,
  Sparkles,
  Trophy,
  Award,
  Gift,
  Tag,
  Pin,
  Share2,
  Copy,
  ExternalLink,
  ChevronRight,
  X,
  Menu,
} from "lucide-react"

interface ForexHeaderProps {
  walletBalance: number
  equity: number
  totalPnl: number
  totalSwap: number
  totalMargin: number
  freeMargin: number
  marginLevel: number
  openTradesCount: number
  pendingOrdersCount: number
  leverage: number
  accountType: string
  accountId: string
  userName: string
  userEmail: string
  isConnected: boolean
  onNavigate: (panel: string) => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  onToggleLock: () => void
  isLocked: boolean
  onToggleSound: () => void
  soundEnabled: boolean
  onToggleTheme: () => void
  theme: "dark" | "light"
  onToggleWatchlist: () => void
  onOpenDeposit: () => void
  onOpenWithdraw: () => void
  onOpenTransfer: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onLogout: () => void
  onSearch: (query: string) => void
  notifications: Array<{ id: string; type: string; title: string; message: string; time: string; read: boolean }>
  onMarkNotificationRead: (id: string) => void
  onClearNotifications: () => void
  activeLanguage: string
  onChangeLanguage: (lang: string) => void
  activeLayout: string
  onChangeLayout: (layout: string) => void
  serverTime: string
  marketStatus: "open" | "closed" | "pre-market"
}

export function ForexHeader({
  walletBalance,
  equity,
  totalPnl,
  totalSwap,
  totalMargin,
  freeMargin,
  marginLevel,
  openTradesCount,
  pendingOrdersCount,
  leverage,
  accountType,
  accountId,
  userName,
  userEmail,
  isConnected,
  onNavigate,
  onToggleFullscreen,
  isFullscreen,
  onToggleLock,
  isLocked,
  onToggleSound,
  soundEnabled,
  onToggleTheme,
  theme,
  onToggleWatchlist,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransfer,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  onSearch,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  activeLanguage,
  onChangeLanguage,
  activeLayout,
  onChangeLayout,
  serverTime,
  marketStatus,
}: ForexHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const formatMoney = (n: number) =>
    hideBalance ? "••••••" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const pnlColor = totalPnl >= 0 ? "#34d399" : "#f87171"
  const pnlBg = totalPnl >= 0 ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)"

  const marginColor = marginLevel > 200 ? "#34d399" : marginLevel > 100 ? "#fbbf24" : "#f87171"

  const languages = [
    { code: "en", label: "English", flag: "EN" },
    { code: "es", label: "Español", flag: "ES" },
    { code: "fr", label: "Français", flag: "FR" },
    { code: "de", label: "Deutsch", flag: "DE" },
    { code: "it", label: "Italiano", flag: "IT" },
    { code: "pt", label: "Português", flag: "PT" },
    { code: "ar", label: "العربية", flag: "AR" },
    { code: "zh", label: "中文", flag: "ZH" },
    { code: "ja", label: "日本語", flag: "JA" },
    { code: "ru", label: "Русский", flag: "RU" },
  ]

  const layouts = [
    { id: "default", label: "Default", desc: "Standard 3-panel layout" },
    { id: "compact", label: "Compact", desc: "Dense view for small screens" },
    { id: "pro", label: "Pro Trader", desc: "Advanced multi-chart view" },
    { id: "scalper", label: "Scalper", desc: "Quick-execution focused" },
    { id: "analyst", label: "Analyst", desc: "Charts and research heavy" },
  ]

  const tools = [
    { id: "calculator", label: "Position Calculator", icon: Calculator, panel: "sizer" },
    { id: "calendar", label: "Economic Calendar", icon: Calendar, panel: "calendar" },
    { id: "news", label: "News Feed", icon: Newspaper, panel: "news" },
    { id: "performance", label: "Performance Report", icon: BarChart3, panel: "performance" },
    { id: "history", label: "Trade History", icon: History, panel: "history" },
    { id: "journal", label: "Trading Journal", icon: Bookmark, panel: "journal" },
    { id: "academy", label: "Trading Academy", icon: GraduationCap, panel: "academy" },
    { id: "support", label: "Live Support", icon: Headphones, panel: "support" },
  ]

  const quickActions = [
    { id: "deposit", label: "Deposit", icon: ArrowDownRight, color: "#34d399", action: onOpenDeposit },
    { id: "withdraw", label: "Withdraw", icon: ArrowUpRight, color: "#fbbf24", action: onOpenWithdraw },
    { id: "transfer", label: "Transfer", icon: RefreshCw, color: "#38bdf8", action: onOpenTransfer },
  ]

  return (
    <header
      className="flex flex-col shrink-0 border-b"
      style={{ background: "linear-gradient(180deg, #0a1424 0%, #060d18 100%)", borderColor: "#1a2640" }}
    >
      {/* ═══ ROW 1: Brand, Search, Quick Actions, Account ═══ */}
      <div className="flex h-12 items-center gap-3 border-b px-4" style={{ borderColor: "#1a2640" }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 pr-3 border-r" style={{ borderColor: "#1a2640" }}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", boxShadow: "0 0 12px rgba(59,130,246,0.4)" }}
          >
            <LineChart className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-black tracking-tight text-white">PRAYSMID</span>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase" style={{ color: "#3d5a80" }}>
              Trading Terminal
            </span>
          </div>
        </div>

        {/* Workspace Switcher */}
        <button
          type="button"
          onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
          className="flex items-center gap-1.5 rounded-md px-2.5 h-8 text-[11px] font-semibold transition-colors hover:bg-[#1a2640]"
          style={{ color: "#cbd5e1", border: "1px solid #1a2640" }}
        >
          <Layers className="h-3.5 w-3.5" style={{ color: "#75bff2" }} />
          <span>{layouts.find(l => l.id === activeLayout)?.label || "Default"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex w-full items-center gap-2 rounded-md px-3 h-8 text-[11px] transition-colors hover:bg-[#1a2640]"
            style={{ background: "#0a1424", border: "1px solid #1a2640", color: "#64748b" }}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search symbols, orders, news...</span>
            <kbd
              className="hidden md:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono"
              style={{ background: "#1a2640", color: "#64748b", border: "1px solid #1a2640" }}
            >
              <Keyboard className="h-2.5 w-2.5" />K
            </kbd>
          </button>
          {searchOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-md shadow-2xl z-50"
              style={{ background: "#0a1424", border: "1px solid #1a2640" }}
            >
              <div className="flex items-center gap-2 px-3 h-10 border-b" style={{ borderColor: "#1a2640" }}>
                <Search className="h-4 w-4" style={{ color: "#75bff2" }} />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); onSearch(e.target.value) }}
                  placeholder="Type to search pairs, orders, news..."
                  className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-slate-500"
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery("") }} className="text-slate-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {[
                  { type: "Pair", label: "EUR/USD", sub: "1.0847 +0.12%" },
                  { type: "Pair", label: "GBP/USD", sub: "1.2634 -0.08%" },
                  { type: "Pair", label: "USD/JPY", sub: "149.32 +0.21%" },
                  { type: "Pair", label: "XAU/USD", sub: "2,341.80 +0.45%" },
                  { type: "Action", label: "Open Position Calculator", sub: "Tools" },
                  { type: "Action", label: "View Economic Calendar", sub: "Tools" },
                  { type: "Action", label: "Read Latest News", sub: "Tools" },
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-[11px] hover:bg-[#1a2640]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                        style={{ background: "#1a2640", color: "#75bff2" }}
                      >
                        {item.type}
                      </span>
                      <span className="text-white font-semibold">{item.label}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Wallet Actions */}
        <div className="flex items-center gap-1">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.action}
                className="flex items-center gap-1.5 rounded-md px-2.5 h-8 text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{ background: `${action.color}15`, color: action.color, border: `1px solid ${action.color}40` }}
                title={action.label}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden lg:inline">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tools Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
            className="flex items-center gap-1.5 rounded-md px-2.5 h-8 text-[11px] font-semibold transition-colors hover:bg-[#1a2640]"
            style={{ color: "#cbd5e1", border: "1px solid #1a2640" }}
          >
            <Briefcase className="h-3.5 w-3.5" style={{ color: "#c084fc" }} />
            <span className="hidden md:inline">Tools</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {toolsMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-64 rounded-md shadow-2xl z-50"
              style={{ background: "#0a1424", border: "1px solid #1a2640" }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#3d5a80" }}>
                  Trading Tools
                </span>
              </div>
              <div className="p-1">
                {tools.map(tool => {
                  const Icon = tool.icon
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => { onNavigate(tool.panel); setToolsMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[11px] hover:bg-[#1a2640]"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "#75bff2" }} />
                      <span className="text-white font-semibold">{tool.label}</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-40" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Language */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
            className="flex items-center gap-1.5 rounded-md px-2 h-8 text-[10px] font-bold uppercase transition-colors hover:bg-[#1a2640]"
            style={{ color: "#cbd5e1", border: "1px solid #1a2640" }}
            title="Language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{activeLanguage.toUpperCase()}</span>
          </button>
          {languageMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-md shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{ background: "#0a1424", border: "1px solid #1a2640" }}
            >
              {languages.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => { onChangeLanguage(lang.code); setLanguageMenuOpen(false) }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] hover:bg-[#1a2640]"
                  style={{ color: activeLanguage === lang.code ? "#75bff2" : "#cbd5e1" }}
                >
                  <span className="font-semibold">{lang.label}</span>
                  <span className="text-[9px] font-mono opacity-60">{lang.flag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative flex items-center justify-center rounded-md h-8 w-8 transition-colors hover:bg-[#1a2640]"
            style={{ color: "#cbd5e1", border: "1px solid #1a2640" }}
            title="Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black"
                style={{ background: "#f87171", color: "white" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-80 rounded-md shadow-2xl z-50"
              style={{ background: "#0a1424", border: "1px solid #1a2640" }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                <span className="text-[11px] font-bold text-white">Notifications</span>
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="text-[9px] font-bold uppercase tracking-wider hover:underline"
                  style={{ color: "#75bff2" }}
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[11px] text-slate-500">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onMarkNotificationRead(n.id)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left border-b hover:bg-[#1a2640]"
                      style={{ borderColor: "#1a2640", background: n.read ? "transparent" : "rgba(59,130,246,0.05)" }}
                    >
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: n.type === "success" ? "rgba(52,211,153,0.15)" : n.type === "warning" ? "rgba(251,191,36,0.15)" : n.type === "error" ? "rgba(248,113,113,0.15)" : "rgba(59,130,246,0.15)",
                          color: n.type === "success" ? "#34d399" : n.type === "warning" ? "#fbbf24" : n.type === "error" ? "#f87171" : "#75bff2",
                        }}
                      >
                        {n.type === "success" ? <CheckCircle2 className="h-3 w-3" /> : n.type === "warning" ? <AlertTriangle className="h-3 w-3" /> : n.type === "error" ? <AlertTriangle className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-white truncate">{n.title}</span>
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3b82f6" }} />}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-500 mt-1 inline-block">{n.time}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center gap-2 rounded-md pl-1 pr-2 h-8 transition-colors hover:bg-[#1a2640]"
            style={{ border: "1px solid #1a2640" }}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white" }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold text-white">{userName}</span>
              <span className="text-[8px] font-mono" style={{ color: "#3d5a80" }}>{accountId}</span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-60" style={{ color: "#cbd5e1" }} />
          </button>
          {accountMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-72 rounded-md shadow-2xl z-50"
              style={{ background: "#0a1424", border: "1px solid #1a2640" }}
            >
              {/* Account info header */}
              <div className="px-3 py-3 border-b" style={{ borderColor: "#1a2640" }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-black"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white" }}
                  >
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-white truncate">{userName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{userEmail}</div>
                  </div>
                  <Crown className="h-4 w-4" style={{ color: "#fbbf24" }} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#75bff2" }}
                  >
                    {accountType}
                  </span>
                  <span className="text-[9px] text-slate-500">1:{leverage} leverage</span>
                </div>
              </div>

              {/* Account actions */}
              <div className="p-1">
                {[
                  { id: "profile", label: "My Profile", icon: User, action: onOpenProfile },
                  { id: "wallet", label: "Wallet & Funding", icon: Wallet, action: onOpenDeposit },
                  { id: "verification", label: "Verification (KYC)", icon: Shield, action: onOpenProfile },
                  { id: "settings", label: "Settings", icon: Settings, action: onOpenSettings },
                  { id: "help", label: "Help Center", icon: HelpCircle, action: () => onNavigate("support") },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { item.action(); setAccountMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[11px] hover:bg-[#1a2640]"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "#75bff2" }} />
                      <span className="text-white font-semibold">{item.label}</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-40" />
                    </button>
                  )
                })}
              </div>

              <div className="border-t p-1" style={{ borderColor: "#1a2640" }}>
                <button
                  type="button"
                  onClick={() => { onLogout(); setAccountMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[11px] hover:bg-[#1a2640]"
                  style={{ color: "#f87171" }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW 2: Account Metrics Bar ═══ */}
      <div className="flex h-10 items-center gap-0 px-0 overflow-x-auto terminal-scroll" style={{ background: "#04070d" }}>
        {/* Connection status */}
        <div
          className="flex items-center gap-1.5 px-3 h-full shrink-0 border-r"
          style={{ borderColor: "#0f1c2e" }}
          title={isConnected ? "Connected to live market data" : "Disconnected — using cached data"}
        >
          {isConnected ? <Wifi className="h-3 w-3" style={{ color: "#34d399" }} /> : <WifiOff className="h-3 w-3" style={{ color: "#f87171" }} />}
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: isConnected ? "#34d399" : "#f87171" }}>
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        {/* Market status */}
        <div
          className="flex items-center gap-1.5 px-3 h-full shrink-0 border-r"
          style={{ borderColor: "#0f1c2e" }}
          title="Market status"
        >
          <CircleDot className="h-3 w-3" style={{ color: marketStatus === "open" ? "#34d399" : marketStatus === "pre-market" ? "#fbbf24" : "#f87171" }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: marketStatus === "open" ? "#34d399" : marketStatus === "pre-market" ? "#fbbf24" : "#f87171" }}>
            Market {marketStatus === "open" ? "Open" : marketStatus === "pre-market" ? "Pre" : "Closed"}
          </span>
        </div>

        {/* Server time */}
        <div
          className="flex items-center gap-1.5 px-3 h-full shrink-0 border-r"
          style={{ borderColor: "#0f1c2e" }}
          title="Server time (UTC)"
        >
          <Clock className="h-3 w-3" style={{ color: "#75bff2" }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#3d5a80" }}>Server</span>
          <span className="price-mono text-[10px] font-bold text-white">{serverTime}</span>
        </div>

        {/* Account metrics */}
        {[
          { label: "Balance", value: formatMoney(walletBalance), color: "#34d399", bg: "rgba(52,211,153,0.06)" },
          { label: "Equity", value: formatMoney(equity), color: totalPnl >= 0 ? "#34d399" : "#f87171", bg: totalPnl >= 0 ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)" },
          { label: "Open P&L", value: `${totalPnl >= 0 ? "+" : ""}${hideBalance ? "••••" : "$" + totalPnl.toFixed(2)}`, color: pnlColor, bg: pnlBg },
          { label: "Margin", value: hideBalance ? "••••" : "$" + totalMargin.toFixed(2), color: "#fbbf24", bg: "rgba(251,191,36,0.05)" },
          { label: "Free Margin", value: hideBalance ? "••••" : "$" + freeMargin.toFixed(2), color: "#38bdf8", bg: "rgba(56,189,248,0.05)" },
          { label: "Margin Level", value: marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : "—", color: marginColor, bg: "transparent" },
          { label: "Open", value: String(openTradesCount), color: "#c084fc", bg: "rgba(192,132,252,0.05)" },
          { label: "Pending", value: String(pendingOrdersCount), color: "#93c5fd", bg: "transparent" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 h-full shrink-0 border-r"
            style={{ borderColor: "#0f1c2e", background: item.bg }}
            title={item.label}
          >
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>{item.label}</span>
            <span className="price-mono text-[11px] font-black" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right-side controls */}
        <div className="flex items-center gap-0.5 px-2 h-full shrink-0">
          <button
            type="button"
            onClick={() => setHideBalance(!hideBalance)}
            className="flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-[#1a2640]"
            style={{ color: "#94a3b8" }}
            title={hideBalance ? "Show balances" : "Hide balances"}
          >
            {hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-[#1a2640]"
            style={{ color: soundEnabled ? "#75bff2" : "#94a3b8" }}
            title={soundEnabled ? "Sound on" : "Sound off"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-[#1a2640]"
            style={{ color: "#94a3b8" }}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            className="flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-[#1a2640]"
            style={{ color: isLocked ? "#f87171" : "#94a3b8" }}
            title={isLocked ? "Unlock trading" : "Lock trading (prevent new orders)"}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center justify-center h-7 w-7 rounded transition-colors hover:bg-[#1a2640]"
            style={{ color: "#94a3b8" }}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
