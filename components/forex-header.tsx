"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  ChevronDown,
  CircleDot,
  Clock,
  Globe,
  Home,
  Layers,
  LifeBuoy,
  LineChart,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"

interface ForexHeaderProps {
  walletBalance: number
  equity: number
  totalPnl: number
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
  onOpenSidebar?: () => void
  onOpenTransfer: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onLogout: () => void
  onSearch: (query: string) => void
  onSelectInstrument: (symbol: string) => void
  instruments: Array<{ symbol: string; name: string; category: string; bid: number; ask: number; change: number }>
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

const menuItems = [
  { id: "support", label: "Support center" },
  { id: "sizer", label: "Position calculator" },
  { id: "news", label: "News & calendar" },
]

export function ForexHeader({
  walletBalance,
  equity,
  totalPnl,
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
  onOpenSidebar,
  onOpenTransfer,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  onSearch,
  onSelectInstrument,
  instruments,
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [useLocalTime, setUseLocalTime] = useState(false)
  const [localTime, setLocalTime] = useState("")
  const [localZone, setLocalZone] = useState("Local")
  const unreadCount = notifications.filter((item) => !item.read).length
  const marketColor = marketStatus === "open" ? "#34d399" : marketStatus === "pre-market" ? "#fbbf24" : "#f87171"
  const formatLocalTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const normalizedQuery = query.trim().toLowerCase()
  const filteredInstruments = instruments.filter((instrument) => !normalizedQuery || `${instrument.symbol} ${instrument.name} ${instrument.category}`.toLowerCase().includes(normalizedQuery))
  const navigateFromMenu = (panel: string) => {
    onNavigate(panel)
    setSearchOpen(false)
    setMenuOpen(false)
    setQuery("")
  }

  useEffect(() => {
    const updateLocalClock = () => setLocalTime(formatLocalTime())
    setLocalZone(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "))
    updateLocalClock()
    const interval = window.setInterval(updateLocalClock, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <header className="terminal-toolbar shrink-0 border-b" style={{ background: "#08111e", borderColor: "#1b2b40" }}>
      <div className="terminal-toolbar-row flex h-12 items-center gap-2.5 px-3 lg:px-4">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open terminal navigation"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            style={{ borderColor: "#21354d", background: "#0d1a2b" }}
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="terminal-brand-lockup flex shrink-0 items-center border-r pr-3" style={{ borderColor: "#1b2b40" }}>
          <img
            src="/elite-fund-logo.jpg"
            onError={(event) => { event.currentTarget.src = "/elite-fund-terminal-logo.png" }}
            alt="Elite Fund — Trade Higher"
            className="h-7 w-auto object-contain"
          />
          <span className="hidden pl-2.5 leading-none sm:block">
            <strong className="block text-[11px] font-black uppercase tracking-[0.14em] text-white">ELITE FUND</strong>
            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300/70">Trading Terminal</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => { window.location.assign("/participant/dashboard") }}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          style={{ borderColor: "#21354d", background: "#0d1a2b" }}
          aria-label="Return to participant welcome home"
          title="Return to participant welcome home"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Home</span>
        </button>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: marketColor, borderColor: `${marketColor}44`, background: `${marketColor}10` }}>
            <CircleDot className="h-2.5 w-2.5" />{marketStatus}
          </span>
          <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: isConnected ? "#34d399" : "#f87171", borderColor: isConnected ? "#34d39944" : "#f8717144", background: isConnected ? "#34d39910" : "#f8717110" }}>
            {isConnected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {isConnected ? "Live" : "Offline"}
          </span>
          <span className="rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400" style={{ borderColor: "#21354d", background: "#0d1a2b" }}>
            1:{leverage} · {accountType}
          </span>
        </div>

        <div className="terminal-header-search relative min-w-0 flex-1 lg:max-w-xs">
          <button type="button" onClick={() => { setSearchOpen((value) => !value); setMenuOpen(false); setAccountOpen(false); setNotificationsOpen(false) }} aria-expanded={searchOpen} className="flex h-8 w-full items-center gap-2 rounded-lg border px-2.5 text-left text-[11px] text-slate-400 transition hover:border-slate-600" style={{ background: "#0d1a2b", borderColor: "#21354d" }}>
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search instruments</span>
            <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 text-[9px] text-slate-500 md:block" style={{ borderColor: "#2a405c" }}>⌘K</kbd>
          </button>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}>
              <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "#1b2b40" }}>
                <Search className="h-3.5 w-3.5 text-cyan-300" />
                <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); onSearch(event.target.value) }} placeholder="EUR/USD, GOLD, BTC..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600" />
                <button type="button" onClick={() => { setSearchOpen(false); setQuery("") }} aria-label="Close search"><X className="h-3.5 w-3.5 text-slate-500" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto p-1.5">
                {filteredInstruments.length > 0 ? filteredInstruments.map((instrument) => {
                  const isUp = instrument.change >= 0
                  return (
                    <button key={instrument.symbol} type="button" onClick={() => { onSelectInstrument(instrument.symbol); setSearchOpen(false); setQuery("") }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">
                      <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-slate-200">{instrument.symbol}</span><span className="block truncate text-[9px] text-slate-500">{instrument.name} · {instrument.category}</span></span>
                      <span className="shrink-0 text-right"><span className="block text-[10px] text-slate-300">{instrument.bid > 0 ? instrument.bid.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span><span className={`block text-[9px] ${isUp ? "text-emerald-300" : "text-red-300"}`}>{instrument.change > 0 ? "+" : ""}{instrument.change.toFixed(2)}%</span></span>
                    </button>
                  )
                }) : <p className="px-2.5 py-3 text-[10px] text-slate-500">No instruments found</p>}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold uppercase text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
          style={{ borderColor: "#21354d", background: "#0d1a2b" }}
          onClick={() => setUseLocalTime((value) => !value)}
          aria-pressed={useLocalTime}
          title={useLocalTime ? `Switch to UTC · ${localZone}` : `Switch to local time · ${localZone}`}
        >
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="hidden sm:inline">{useLocalTime ? localTime : serverTime}</span>
          <span className="text-[8px] font-bold text-cyan-300/80">{useLocalTime ? "LOC" : "UTC"}</span>
        </button>

        <div className="relative">
          <button type="button" onClick={() => { setMenuOpen((value) => !value); setSearchOpen(false); setAccountOpen(false); setNotificationsOpen(false) }} aria-expanded={menuOpen} className="terminal-icon-button flex h-8 w-8 items-center justify-center rounded-lg border text-slate-300" style={{ borderColor: "#21354d", background: "#0d1a2b" }} aria-label={menuOpen ? "Close terminal menu" : "Open terminal menu"} title={menuOpen ? "Close terminal menu" : "Open terminal menu"}><Menu className="h-4 w-4" /></button>
          {menuOpen && <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border p-1.5 shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}>
            {menuItems.map((item) => <button key={item.id} type="button" onClick={() => navigateFromMenu(item.id)} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Layers className="h-3.5 w-3.5 text-cyan-300" />{item.label}</button>)}
            <div className="my-1 border-t" style={{ borderColor: "#1b2b40" }} />
            <button type="button" onClick={() => { onToggleWatchlist(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Wallet className="h-3.5 w-3.5 text-cyan-300" />Focus watchlist</button>
            <button type="button" onClick={() => { onOpenTransfer(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Wallet className="h-3.5 w-3.5" />Transfer funds</button>
            <button type="button" onClick={() => { onToggleFullscreen(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
            <button type="button" onClick={() => { onToggleLock(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">{isLocked ? "Unlock trading" : "Lock trading"}</button>
            <button type="button" onClick={() => { onToggleSound(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">Sound {soundEnabled ? "on" : "off"}</button>
            <button type="button" onClick={() => { onToggleTheme(); setMenuOpen(false) }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">Switch to {theme === "dark" ? "light" : "dark"} mode</button>
          </div>}
        </div>

        <div className="relative">
          <button type="button" onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); setMenuOpen(false); setAccountOpen(false) }} aria-expanded={notificationsOpen} className="terminal-icon-button flex h-8 w-8 items-center justify-center rounded-lg border text-slate-300" style={{ borderColor: "#21354d", background: "#0d1a2b" }} aria-label="Notifications"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
          {notificationsOpen && <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}><div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#1b2b40" }}><span className="text-[11px] font-bold text-white">Notifications</span><button type="button" onClick={onClearNotifications} className="text-[9px] uppercase text-cyan-300">Clear</button></div>{notifications.length === 0 ? <p className="px-3 py-6 text-center text-[11px] text-slate-500">No notifications</p> : notifications.map((item) => <button key={item.id} type="button" onClick={() => onMarkNotificationRead(item.id)} className="block w-full border-b px-3 py-2 text-left hover:bg-white/5" style={{ borderColor: "#1b2b40" }}><span className="block text-[11px] font-semibold text-white">{item.title}</span><span className="block text-[10px] text-slate-400">{item.message}</span></button>)}</div>}
        </div>

        <div className="relative">
          <button type="button" onClick={() => { setAccountOpen((value) => !value); setSearchOpen(false); setMenuOpen(false); setNotificationsOpen(false) }} aria-expanded={accountOpen} className="terminal-account-button flex h-8 items-center gap-2 rounded-lg border px-2 text-left" style={{ borderColor: "#21354d", background: "#0d1a2b" }}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[9px] font-black text-cyan-200">{userName.slice(0, 2).toUpperCase()}</span>
            <span className="hidden max-w-28 leading-none sm:block"><strong className="block truncate text-[10px] text-white">{userName}</strong><span className="mt-0.5 block truncate text-[8px] text-slate-400">{accountType} · {isConnected ? "Live" : "Offline"}</span></span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {accountOpen && <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border p-2 shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}><div className="border-b px-2 pb-2" style={{ borderColor: "#1b2b40" }}><p className="text-xs font-bold text-white">{userName}</p><p className="mt-1 truncate text-[10px] text-slate-400">{userEmail}</p><p className="mt-1 text-[9px] text-cyan-300">{openTradesCount} open · {pendingOrdersCount} pending · {isConnected ? "Live" : "Offline"}</p></div><button type="button" onClick={() => { setAccountOpen(false); onOpenProfile() }} className="terminal-menu-item"><Shield className="h-3.5 w-3.5" />Profile</button><button type="button" onClick={() => { setAccountOpen(false); onNavigate("support") }} className="terminal-menu-item"><LifeBuoy className="h-3.5 w-3.5 text-cyan-300" />Support Center</button><button type="button" onClick={() => { setAccountOpen(false); onNavigate("smart-alerts") }} className="terminal-menu-item"><Bell className="h-3.5 w-3.5 text-amber-300" />Smart Alerts</button><button type="button" onClick={() => { setAccountOpen(false); onOpenSettings() }} className="terminal-menu-item"><Settings className="h-3.5 w-3.5" />Settings</button><button type="button" onClick={() => { setAccountOpen(false); onLogout() }} className="terminal-menu-item text-red-300"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>}
        </div>
      </div>
    </header>
  )
}

