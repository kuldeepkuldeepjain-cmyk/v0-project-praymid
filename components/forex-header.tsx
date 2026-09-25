"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleDot,
  Clock,
  Layers,
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

const menuItems = [
  { id: "positions", label: "Open positions" },
  { id: "pending", label: "Pending orders" },
  { id: "history", label: "Trade history" },
  { id: "news", label: "News & calendar" },
  { id: "sizer", label: "Position calculator" },
]

export function ForexHeader({
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
  serverTime,
  marketStatus,
}: ForexHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [useLocalTime, setUseLocalTime] = useState(false)
  const [localTime, setLocalTime] = useState(serverTime)
  const [localZone, setLocalZone] = useState("Local")
  const unreadCount = notifications.filter((item) => !item.read).length
  const marketColor = marketStatus === "open" ? "#34d399" : marketStatus === "pre-market" ? "#fbbf24" : "#f87171"
  const formatLocalTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const filteredMenuItems = menuItems.filter((item) => !query.trim() || item.label.toLowerCase().includes(query.trim().toLowerCase()))
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
      <div className="flex min-h-14 items-center gap-2 px-3 py-2 lg:px-4">
        <div className="flex shrink-0 items-center gap-2 border-r pr-3" style={{ borderColor: "#1b2b40" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#1d78b5" }}>
            <LineChart className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <button type="button" onClick={() => { setSearchOpen((value) => !value); setMenuOpen(false); setAccountOpen(false); setNotificationsOpen(false) }} aria-expanded={searchOpen} className="flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-left text-[11px] text-slate-400 transition hover:border-slate-600" style={{ background: "#0d1a2b", borderColor: "#21354d" }}>
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">Search instruments</span>
            <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 text-[9px] text-slate-500 md:block" style={{ borderColor: "#2a405c" }}>⌘K</kbd>
          </button>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}>
              <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "#1b2b40" }}>
                <Search className="h-3.5 w-3.5 text-cyan-300" />
                <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); onSearch(event.target.value) }} placeholder="EUR/USD, GOLD, BTC..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600" />
                <button type="button" onClick={() => { setSearchOpen(false); setQuery("") }} aria-label="Close search"><X className="h-3.5 w-3.5 text-slate-500" /></button>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5">
                {filteredMenuItems.length > 0 ? filteredMenuItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigateFromMenu(item.id)} className="w-full rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">
                    {item.label}
                  </button>
                )) : <p className="px-2.5 py-3 text-[10px] text-slate-500">No terminal option found</p>}
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <button type="button" onClick={onOpenDeposit} className="terminal-icon-button text-emerald-300" aria-label="Deposit funds" title="Deposit funds"><ArrowDownRight className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onOpenWithdraw} className="terminal-icon-button text-amber-300" aria-label="Withdraw funds" title="Withdraw funds"><ArrowUpRight className="h-3.5 w-3.5" /></button>
        </div>

        <div className="relative">
          <button type="button" onClick={() => { setMenuOpen((value) => !value); setSearchOpen(false); setAccountOpen(false); setNotificationsOpen(false) }} aria-expanded={menuOpen} className="terminal-icon-button" aria-label={menuOpen ? "Close terminal menu" : "Open terminal menu"}><Menu className="h-4 w-4" /></button>
          {menuOpen && <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border p-1.5 shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}>
            {menuItems.map((item) => <button key={item.id} type="button" onClick={() => navigateFromMenu(item.id)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Layers className="h-3.5 w-3.5 text-cyan-300" />{item.label}</button>)}
            <div className="my-1 border-t" style={{ borderColor: "#1b2b40" }} />
            <button type="button" onClick={() => { onToggleWatchlist(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Wallet className="h-3.5 w-3.5 text-cyan-300" />Focus watchlist</button>
            <button type="button" onClick={() => { onOpenDeposit(); setMenuOpen(false) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-emerald-300 hover:bg-white/5"><ArrowDownRight className="h-3.5 w-3.5" />Deposit funds</button>
            <button type="button" onClick={() => { onOpenWithdraw(); setMenuOpen(false) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-amber-300 hover:bg-white/5"><ArrowUpRight className="h-3.5 w-3.5" />Withdraw funds</button>
            <button type="button" onClick={() => { onOpenTransfer(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"><Wallet className="h-3.5 w-3.5" />Transfer funds</button>
            <button type="button" onClick={() => { onToggleFullscreen(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
            <button type="button" onClick={() => { onToggleLock(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">{isLocked ? "Unlock trading" : "Lock trading"}</button>
            <button type="button" onClick={() => { onToggleSound(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">Sound {soundEnabled ? "on" : "off"}</button>
            <button type="button" onClick={() => { onToggleTheme(); setMenuOpen(false) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300">Switch to {theme === "dark" ? "light" : "dark"} mode</button>
          </div>}
        </div>

        <div className="relative">
          <button type="button" onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); setMenuOpen(false); setAccountOpen(false) }} aria-expanded={notificationsOpen} className="terminal-icon-button" aria-label="Notifications"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
          {notificationsOpen && <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}><div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#1b2b40" }}><span className="text-[11px] font-bold text-white">Notifications</span><button type="button" onClick={onClearNotifications} className="text-[9px] uppercase text-cyan-300">Clear</button></div>{notifications.length === 0 ? <p className="px-3 py-6 text-center text-[11px] text-slate-500">No notifications</p> : notifications.map((item) => <button key={item.id} type="button" onClick={() => onMarkNotificationRead(item.id)} className="block w-full border-b px-3 py-2 text-left hover:bg-white/5" style={{ borderColor: "#1b2b40" }}><span className="block text-[11px] font-semibold text-white">{item.title}</span><span className="block text-[10px] text-slate-400">{item.message}</span></button>)}</div>}
        </div>


        <div className="relative">
          <button type="button" onClick={() => { setAccountOpen((value) => !value); setSearchOpen(false); setMenuOpen(false); setNotificationsOpen(false) }} aria-expanded={accountOpen} className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left" style={{ borderColor: "#21354d" }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-black text-cyan-200">{userName.slice(0, 2).toUpperCase()}</span>
            <span className="sr-only">{userName}, {accountType}, 1:{leverage}</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {accountOpen && <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border p-2 shadow-2xl" style={{ background: "#0d1a2b", borderColor: "#2a405c" }}><div className="border-b px-2 pb-2" style={{ borderColor: "#1b2b40" }}><p className="text-xs font-bold text-white">{userName}</p><p className="mt-1 truncate text-[10px] text-slate-500">{userEmail}</p><p className="mt-1 text-[9px] text-cyan-300">{openTradesCount} open · {pendingOrdersCount} pending · {isConnected ? "Live" : "Offline"}</p></div><button type="button" onClick={() => { setAccountOpen(false); onOpenProfile() }} className="terminal-menu-item"><Shield className="h-3.5 w-3.5" />Profile</button><button type="button" onClick={() => { setAccountOpen(false); onOpenSettings() }} className="terminal-menu-item"><Settings className="h-3.5 w-3.5" />Settings</button><button type="button" onClick={() => { setAccountOpen(false); onLogout() }} className="terminal-menu-item text-red-300"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>}
        </div>
      </div>

      <div className="flex h-7 items-center gap-3 overflow-x-auto border-t px-3 terminal-scroll" style={{ borderColor: "#122238", color: "#7187a0" }}>
        <span className="sr-only">{isConnected ? "Connected" : "Offline"}. Market {marketStatus}. {openTradesCount} positions, {pendingOrdersCount} pending orders.</span>
        <span className="flex items-center" style={{ color: isConnected ? "#34d399" : "#f87171" }} aria-hidden="true" title={isConnected ? "Connected" : "Offline"}>{isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}</span>
        <span className="flex items-center" style={{ color: marketColor }} aria-hidden="true" title={`Market ${marketStatus}`}><CircleDot className="h-3 w-3" /></span>
        <button
          type="button"
          className="terminal-time-switch"
          onClick={() => setUseLocalTime((value) => !value)}
          aria-pressed={useLocalTime}
          aria-label={useLocalTime ? `Use UTC time. Current local zone: ${localZone}` : `Use local time. Current zone: ${localZone}`}
          title={useLocalTime ? `Switch to UTC · ${localZone}` : `Switch to local time · ${localZone}`}
        >
          <Clock className="h-3 w-3" />
          <span>{useLocalTime ? localTime : serverTime}</span>
        </button>
      </div>
    </header>
  )
}

