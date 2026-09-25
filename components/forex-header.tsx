"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search, X, Bell, Settings, User, ChevronDown, Globe, Layout, Sun, Moon,
  RefreshCw, Command, Wallet, Plus, ArrowUpDown, ShieldAlert, TrendingUp,
  TrendingDown, Activity, Wifi, WifiOff, Clock, Server, Volume2, VolumeX,
  Eye, EyeOff, Download, Upload, HelpCircle, LogOut, CreditCard, BarChart3,
  Newspaper, Calendar, AlertTriangle, CheckCircle2, Info, Star, Bookmark,
  Zap, Gauge, Layers, Grid3x3, Square, Maximize2, Minimize2, RotateCcw,
  Filter, MoreHorizontal, ChevronRight, Mail, Phone, MessageSquare,
} from "lucide-react"

type AccountType = "live" | "demo" | "funded"
type Language = "en" | "es" | "fr" | "de" | "ja" | "zh"
type LayoutMode = "default" | "compact" | "wide" | "focus"

type Notification = {
  id: string
  type: "price" | "order" | "news" | "system" | "margin"
  title: string
  message: string
  time: string
  read: boolean
}

type PriceAlert = {
  id: string
  symbol: string
  condition: "above" | "below"
  price: number
  active: boolean
}

type ForexHeaderProps = {
  // Account
  accountType: AccountType
  accountId: string
  accountName: string
  walletBalance: number
  equity: number
  totalPnl: number
  totalMargin: number
  freeMargin: number
  marginLevel: number
  openTradesCount: number
  pendingOrdersCount: number
  // Market
  online: boolean
  lastUpdated: Date | null
  tickCount: number
  // UI
  isDarkTheme: boolean
  onToggleTheme: () => void
  onRefresh: () => void
  candleLoading: boolean
  // Actions
  onAddFunds?: () => void
  onPayout?: () => void
  onBalance?: () => void
  onFundedFunds?: () => void
  isFundedAccount?: boolean
  // Command palette
  onOpenCommandPalette: () => void
  // Notifications
  notifications?: Notification[]
  onMarkAllRead?: () => void
  // Price alerts
  priceAlerts?: PriceAlert[]
  onToggleAlert?: (id: string) => void
  // Layout
  chartLayout: "single" | "grid"
  onToggleChartLayout: () => void
  chartExpanded: boolean
  onToggleChartExpand: () => void
  // Sound
  soundEnabled: boolean
  onToggleSound: () => void
}

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",  flag: "EN" },
  { code: "es", label: "Español",  flag: "ES" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "de", label: "Deutsch",  flag: "DE" },
  { code: "ja", label: "日本語",    flag: "JA" },
  { code: "zh", label: "中文",      flag: "ZH" },
]

const LAYOUT_MODES: { id: LayoutMode; label: string; icon: typeof Square; desc: string }[] = [
  { id: "default", label: "Default",  icon: Square,      desc: "Standard 3-column layout" },
  { id: "compact", label: "Compact",  icon: Minimize2,   desc: "Denser panels, more data" },
  { id: "wide",    label: "Wide",     icon: Maximize2,   desc: "Expanded chart area" },
  { id: "focus",   label: "Focus",    icon: Eye,         desc: "Chart-only, hide panels" },
]

export function ForexHeader(props: ForexHeaderProps) {
  const {
    accountType, accountId, accountName, walletBalance, equity, totalPnl,
    totalMargin, freeMargin, marginLevel, openTradesCount, pendingOrdersCount,
    online, lastUpdated, tickCount, isDarkTheme, onToggleTheme, onRefresh,
    candleLoading, onAddFunds, onPayout, onBalance, onFundedFunds,
    isFundedAccount, onOpenCommandPalette, notifications = [],
    onMarkAllRead, priceAlerts = [], onToggleAlert, chartLayout,
    onToggleChartLayout, chartExpanded, onToggleChartExpand,
    soundEnabled, onToggleSound,
  } = props

  // ── Dropdown states ────────────────────────────────────────────────────────
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en")
  const [selectedLayout, setSelectedLayout] = useState<LayoutMode>("default")
  const [showBalance, setShowBalance] = useState(true)
  const [serverTime, setServerTime] = useState(new Date())
  const [pingMs, setPingMs] = useState(42)
  const headerRef = useRef<HTMLDivElement>(null)

  // ── Close dropdowns on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Server time tick ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setServerTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Simulated ping fluctuation ─────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setPingMs(prev => Math.max(8, Math.min(180, prev + Math.floor(Math.random() * 11) - 5)))
    }, 3000)
    return () => clearInterval(id)
  }, [])

  // ── Derived values ─────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length
  const activeAlerts = priceAlerts.filter(a => a.active).length
  const accountTypeColor = accountType === "live" ? "#10b981" : accountType === "demo" ? "#f59e0b" : "#a855f7"
  const accountTypeBg = accountType === "live" ? "rgba(16,185,129,0.10)" : accountType === "demo" ? "rgba(245,158,11,0.10)" : "rgba(168,85,247,0.10)"
  const accountTypeBorder = accountType === "live" ? "rgba(16,185,129,0.30)" : accountType === "demo" ? "rgba(245,158,11,0.30)" : "rgba(168,85,247,0.30)"
  const marginColor = marginLevel > 200 ? "#10b981" : marginLevel > 100 ? "#f59e0b" : "#ef4444"
  const pnlColor = totalPnl >= 0 ? "#10b981" : "#ef4444"

  const toggleMenu = useCallback((id: string) => {
    setOpenMenu(prev => prev === id ? null : id)
  }, [])

  return (
    <div
      ref={headerRef}
      className="flex items-center shrink-0 h-11 gap-0 relative z-40"
      style={{
        background: "linear-gradient(180deg, #0f1a2e 0%, #0a1424 100%)",
        borderBottom: "1px solid rgba(34,211,238,0.12)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      {/* ═══ LEFT: Brand + Account ═══════════════════════════════════════════ */}
      <div className="flex items-center h-full shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 h-full" style={{ borderRight: "1px solid rgba(34,211,238,0.08)" }}>
          <div className="relative">
            <img src="/elite-fund-logo.jpg" alt="Elite Fund" className="h-7 w-7 rounded object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 4px #10b981" }} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-black tracking-[0.10em] text-white">ELITE FUND</span>
            <span className="text-[8px] font-bold tracking-[0.14em] mt-0.5" style={{ color: "#22d3ee" }}>MT5 TERMINAL</span>
          </div>
        </div>

        {/* Account selector */}
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => toggleMenu("account")}
            className="flex items-center gap-2 h-full px-3 transition-colors hover:bg-white/5"
            style={{ borderRight: "1px solid rgba(34,211,238,0.08)" }}
          >
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded" style={{ background: accountTypeBg, border: `1px solid ${accountTypeBorder}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: accountTypeColor, boxShadow: `0 0 4px ${accountTypeColor}` }} />
              <span className="text-[8px] font-black tracking-[0.14em] uppercase" style={{ color: accountTypeColor }}>
                {accountType}
              </span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold text-white">{accountName}</span>
              <span className="text-[8px] font-mono mt-0.5" style={{ color: "#3d5a80" }}>{accountId}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {openMenu === "account" && (
            <div className="absolute left-0 top-full w-72 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Switch Account</span>
              </div>
              {[
                { type: "live" as AccountType, name: "Live Trading", id: "LF-100247", balance: walletBalance, color: "#10b981" },
                { type: "demo" as AccountType, name: "Demo Practice", id: "DM-582913", balance: 10000, color: "#f59e0b" },
                { type: "funded" as AccountType, name: "Funded Tier 1", id: "FD-001847", balance: 50000, color: "#a855f7" },
              ].map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded shrink-0" style={{ background: `${acc.color}15`, border: `1px solid ${acc.color}40` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: acc.color }} />
                    <span className="text-[8px] font-black tracking-[0.14em] uppercase" style={{ color: acc.color }}>{acc.type}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-white truncate">{acc.name}</span>
                    <span className="text-[8px] font-mono" style={{ color: "#3d5a80" }}>{acc.id}</span>
                  </div>
                  <span className="price-mono text-[10px] font-bold" style={{ color: acc.color }}>
                    ${acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
              <div className="border-t px-3 py-2" style={{ borderColor: "#1a2640" }}>
                <button type="button" className="flex w-full items-center gap-2 text-[9px] font-bold tracking-wider uppercase text-cyan-300 hover:text-cyan-200 transition-colors">
                  <Plus className="h-3 w-3" />
                  <span>Open New Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CENTER: Margin + Positions ════════════════════════════════════════ */}
      <div className="flex items-center h-full shrink-0" style={{ borderRight: "1px solid rgba(34,211,238,0.08)" }}>
        {/* Margin */}
        <div className="flex items-center gap-2 h-full px-3" style={{ borderLeft: "1px solid rgba(34,211,238,0.06)" }}>
          <Gauge className="h-3.5 w-3.5 text-amber-400" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>Margin</span>
            <span className="price-mono text-[12px] font-black mt-0.5" style={{ color: marginColor }}>
              {marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Positions */}
        <div className="flex items-center gap-2 h-full px-3" style={{ borderLeft: "1px solid rgba(34,211,238,0.06)" }}>
          <Layers className="h-3.5 w-3.5 text-purple-400" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>Positions</span>
            <span className="price-mono text-[12px] font-black text-white mt-0.5">
              {openTradesCount}<span className="text-[9px] text-slate-500 ml-1">/ {pendingOrdersCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Status + Actions ══════════════════════════════════════════ */}
      <div className="flex items-center h-full ml-auto">
        {/* Connection status */}
        <div className="flex items-center gap-2 h-full px-3" style={{ borderLeft: "1px solid rgba(34,211,238,0.08)" }}>
          {online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
          <div className="flex flex-col items-start leading-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: online ? "#10b981" : "#ef4444", boxShadow: `0 0 4px ${online ? "#10b981" : "#ef4444"}` }} />
              <span className="text-[8px] font-black tracking-[0.14em] uppercase" style={{ color: online ? "#10b981" : "#ef4444" }}>
                {online ? "Connected" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8px] font-mono" style={{ color: "#3d5a80" }}>{pingMs}ms</span>
              <span style={{ color: "#1e2d45" }}>·</span>
              <span className="text-[8px] font-mono" style={{ color: "#3d5a80" }}>
                {serverTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
            </div>
          </div>
        </div>

        {/* Tick counter */}
        <div className="hidden lg:flex items-center gap-1.5 h-full px-3" style={{ borderLeft: "1px solid rgba(34,211,238,0.06)" }}>
          <Zap className="h-3 w-3 text-cyan-400" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>Ticks</span>
            <span className="price-mono text-[10px] font-black text-cyan-400 mt-0.5">{tickCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "rgba(34,211,238,0.08)" }} />

        {/* Action buttons */}
        <div className="flex items-center h-full">
          {/* Command palette */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 h-full px-2.5 transition-colors hover:bg-white/5"
            title="Command Palette (Ctrl+K)"
          >
            <Command className="h-3.5 w-3.5 text-purple-300" />
            <kbd className="text-[8px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}>⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => toggleMenu("notifications")}
              className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5 relative"
              title="Notifications"
            >
              <Bell className="h-3.5 w-3.5 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black text-white px-1" style={{ background: "#ef4444", boxShadow: "0 0 4px rgba(239,68,68,0.5)" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {openMenu === "notifications" && (
              <div className="absolute right-0 top-full w-80 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                  <div className="flex items-center gap-2">
                    <Bell className="h-3 w-3 text-cyan-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {onMarkAllRead && unreadCount > 0 && (
                    <button type="button" onClick={onMarkAllRead} className="text-[8px] font-bold tracking-wider uppercase text-cyan-400 hover:text-cyan-300">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto terminal-scroll">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <Bell className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                      <p className="text-[9px] text-slate-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(n => {
                      const Icon = n.type === "price" ? TrendingUp : n.type === "order" ? CheckCircle2 : n.type === "news" ? Newspaper : n.type === "margin" ? AlertTriangle : Info
                      const color = n.type === "price" ? "#22d3ee" : n.type === "order" ? "#10b981" : n.type === "news" ? "#f59e0b" : n.type === "margin" ? "#ef4444" : "#94a3b8"
                      return (
                        <div key={n.id} className="flex gap-2.5 px-3 py-2.5 border-b transition-colors hover:bg-white/5" style={{ borderColor: "#0f1c2e", background: n.read ? "transparent" : "rgba(34,211,238,0.03)" }}>
                          <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-white truncate">{n.title}</span>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#22d3ee" }} />}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[8px] text-slate-600 mt-1 block">{n.time}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="border-t px-3 py-2" style={{ borderColor: "#1a2640" }}>
                  <button type="button" className="flex w-full items-center justify-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-cyan-300 hover:text-cyan-200 transition-colors">
                    <span>View all notifications</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Price alerts */}
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => toggleMenu("alerts")}
              className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5 relative"
              title="Price Alerts"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-slate-300" />
              {activeAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black text-white px-1" style={{ background: "#f59e0b", boxShadow: "0 0 4px rgba(245,158,11,0.5)" }}>
                  {activeAlerts}
                </span>
              )}
            </button>
            {openMenu === "alerts" && (
              <div className="absolute right-0 top-full w-72 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white">Price Alerts</span>
                  </div>
                  <button type="button" className="text-[8px] font-bold tracking-wider uppercase text-cyan-400 hover:text-cyan-300">
                    + New
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto terminal-scroll">
                  {priceAlerts.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <AlertTriangle className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                      <p className="text-[9px] text-slate-500">No price alerts set</p>
                    </div>
                  ) : (
                    priceAlerts.slice(0, 8).map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 border-b" style={{ borderColor: "#0f1c2e" }}>
                        <span className="text-[10px] font-bold text-white w-16 truncate">{a.symbol}</span>
                        <span className="text-[8px] font-bold tracking-wider uppercase" style={{ color: a.condition === "above" ? "#10b981" : "#ef4444" }}>
                          {a.condition}
                        </span>
                        <span className="price-mono text-[10px] font-bold text-white flex-1 text-right">{a.price.toFixed(5)}</span>
                        {onToggleAlert && (
                          <button
                            type="button"
                            onClick={() => onToggleAlert(a.id)}
                            className="w-7 h-4 rounded-full transition-colors relative shrink-0"
                            style={{ background: a.active ? "#10b981" : "#374151" }}
                          >
                            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: a.active ? "14px" : "2px" }} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Layout switcher */}
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => toggleMenu("layout")}
              className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5"
              title="Layout"
            >
              <Layout className="h-3.5 w-3.5 text-slate-300" />
            </button>
            {openMenu === "layout" && (
              <div className="absolute right-0 top-full w-64 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Workspace Layout</span>
                </div>
                {LAYOUT_MODES.map(mode => {
                  const Icon = mode.icon
                  const isActive = selectedLayout === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => { setSelectedLayout(mode.id); setOpenMenu(null) }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                      style={{ background: isActive ? "rgba(34,211,238,0.06)" : "transparent" }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? "#22d3ee" : "#94a3b8" }} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-white">{mode.label}</span>
                        <span className="text-[8px] text-slate-500">{mode.desc}</span>
                      </div>
                      {isActive && <CheckCircle2 className="h-3 w-3 text-cyan-400 shrink-0" />}
                    </button>
                  )
                })}
                <div className="border-t px-3 py-2" style={{ borderColor: "#1a2640" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400">Chart Layout</span>
                    <button
                      type="button"
                      onClick={onToggleChartLayout}
                      className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                      style={{ background: chartLayout === "grid" ? "rgba(168,85,247,0.15)" : "rgba(34,211,238,0.10)", border: `1px solid ${chartLayout === "grid" ? "rgba(168,85,247,0.30)" : "rgba(34,211,238,0.20)"}` }}
                    >
                      {chartLayout === "single" ? <Grid3x3 className="h-3 w-3 text-purple-300" /> : <Square className="h-3 w-3 text-cyan-300" />}
                      <span className="text-[8px] font-black tracking-wider uppercase" style={{ color: chartLayout === "grid" ? "#c084fc" : "#22d3ee" }}>
                        {chartLayout === "single" ? "Grid" : "Single"}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-bold text-slate-400">Expand Chart</span>
                    <button
                      type="button"
                      onClick={onToggleChartExpand}
                      className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                      style={{ background: chartExpanded ? "rgba(16,185,129,0.15)" : "rgba(34,211,238,0.10)", border: `1px solid ${chartExpanded ? "rgba(16,185,129,0.30)" : "rgba(34,211,238,0.20)"}` }}
                    >
                      {chartExpanded ? <Minimize2 className="h-3 w-3 text-emerald-300" /> : <Maximize2 className="h-3 w-3 text-cyan-300" />}
                      <span className="text-[8px] font-black tracking-wider uppercase" style={{ color: chartExpanded ? "#10b981" : "#22d3ee" }}>
                        {chartExpanded ? "Restore" : "Expand"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Language */}
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => toggleMenu("language")}
              className="flex items-center gap-1 h-full px-2.5 transition-colors hover:bg-white/5"
              title="Language"
            >
              <Globe className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-[8px] font-black tracking-wider text-slate-400">
                {LANGUAGES.find(l => l.code === selectedLanguage)?.flag}
              </span>
            </button>
            {openMenu === "language" && (
              <div className="absolute right-0 top-full w-48 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: "#1a2640" }}>
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Language</span>
                </div>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => { setSelectedLanguage(lang.code); setOpenMenu(null) }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    style={{ background: selectedLanguage === lang.code ? "rgba(34,211,238,0.06)" : "transparent" }}
                  >
                    <span className="text-[9px] font-black tracking-wider w-6 text-cyan-400">{lang.flag}</span>
                    <span className="text-[10px] font-bold text-white flex-1">{lang.label}</span>
                    {selectedLanguage === lang.code && <CheckCircle2 className="h-3 w-3 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5"
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5"
            title={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
          >
            {isDarkTheme ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-blue-400" />}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center h-full px-2.5 transition-colors hover:bg-white/5"
            title="Refresh market data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${candleLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Divider */}
          <div className="w-px h-6" style={{ background: "rgba(34,211,238,0.08)" }} />

          {/* Fund buttons */}
          <div className="flex items-center h-full">
            {onBalance && (
              <button
                type="button"
                onClick={onBalance}
                className="flex items-center gap-1 h-full px-2.5 transition-colors hover:bg-white/5"
                title="Account Balance"
              >
                <CreditCard className="h-3.5 w-3.5 text-cyan-300" />
                <span className="hidden xl:inline text-[9px] font-black tracking-wider uppercase text-cyan-200">Balance</span>
              </button>
            )}
            {isFundedAccount && onFundedFunds && (
              <button
                type="button"
                onClick={onFundedFunds}
                className="flex items-center gap-1 h-full px-2.5 transition-colors hover:bg-white/5"
                title="Funded-tier Funding"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden xl:inline text-[9px] font-black tracking-wider uppercase text-amber-200">Funded</span>
              </button>
            )}
            {onAddFunds && (
              <button
                type="button"
                onClick={onAddFunds}
                className="flex items-center gap-1 h-full px-3 transition-colors"
                style={{ background: "linear-gradient(180deg, #f58220 0%, #d96a10 100%)" }}
                title="Add Funds"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span className="hidden xl:inline text-[9px] font-black tracking-wider uppercase text-white">Add Fund</span>
              </button>
            )}
            {onPayout && (
              <button
                type="button"
                onClick={onPayout}
                className="flex items-center gap-1 h-full px-2.5 transition-colors hover:bg-white/5"
                title="Request Payout"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-emerald-300" />
                <span className="hidden xl:inline text-[9px] font-black tracking-wider uppercase text-emerald-200">Payout</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ background: "rgba(34,211,238,0.08)" }} />

          {/* User profile */}
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => toggleMenu("profile")}
              className="flex items-center gap-2 h-full px-3 transition-colors hover:bg-white/5"
              title="Account"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)" }}>
                {accountName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden xl:flex flex-col items-start leading-none">
                <span className="text-[10px] font-bold text-white">{accountName}</span>
                <span className="text-[8px] font-mono mt-0.5" style={{ color: "#3d5a80" }}>{accountId}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>
            {openMenu === "profile" && (
              <div className="absolute right-0 top-full w-64 rounded-md shadow-2xl overflow-hidden" style={{ background: "#0b111d", border: "1px solid #1e2d45" }}>
                <div className="px-3 py-3 border-b" style={{ borderColor: "#1a2640" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)" }}>
                      {accountName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white">{accountName}</span>
                      <span className="text-[8px] font-mono" style={{ color: "#3d5a80" }}>{accountId}</span>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  {[
                    { icon: User, label: "My Profile", desc: "View and edit account details" },
                    { icon: CreditCard, label: "Billing & Payments", desc: "Manage payment methods" },
                    { icon: BarChart3, label: "Trading History", desc: "View all past trades" },
                    { icon: Star, label: "Watchlists", desc: "Manage your symbol lists" },
                    { icon: Bookmark, label: "Saved Layouts", desc: "Quick-switch workspace setups" },
                    { icon: Settings, label: "Settings", desc: "Preferences and security" },
                    { icon: HelpCircle, label: "Help & Support", desc: "Docs, tutorials, contact" },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setOpenMenu(null)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-white">{item.label}</span>
                          <span className="text-[8px] text-slate-500">{item.desc}</span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-slate-600" />
                      </button>
                    )
                  })}
                </div>
                <div className="border-t py-1" style={{ borderColor: "#1a2640" }}>
                  <button
                    type="button"
                    onClick={() => { window.location.href = "/participant/dashboard" }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="text-[10px] font-bold text-red-300">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
