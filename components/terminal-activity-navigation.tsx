"use client"

import { useEffect, useRef, useState } from "react"
import {
  Activity, ArrowRight, BarChart2, Bell, BellRing, BookOpen, BrainCircuit,
  Calculator, Check, ChevronLeft, ChevronRight, Clock, Globe2, Grid3X3,
  History, Layers, LifeBuoy, Newspaper, Plus, RotateCcw, Search,
  ShieldAlert, ShieldCheck, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import styles from "./terminal-activity-navigation.module.css"

export const ACTIVITY_TOOLS = [
  { id: "positions", title: "Open positions", short: "Positions", group: "Trading", description: "Monitor trades and manage SL / TP.", icon: Layers, keywords: "buy sell active close stop loss take profit" },
  { id: "pending", title: "Pending orders", short: "Orders", group: "Trading", description: "Review or cancel working orders.", icon: Clock, keywords: "limit stop execution cancel" },
  { id: "history", title: "Trade history", short: "History", group: "Trading", description: "Inspect closed trades and results.", icon: History, keywords: "closed fills transactions profit loss" },
  { id: "dom", title: "Depth of market", short: "L2 book", group: "Markets", description: "Inspect the L2 order book ladder.", icon: BarChart2, keywords: "liquidity bid ask ladder order book" },
  { id: "depth", title: "Order depth", short: "Depth", group: "Markets", description: "Explore market depth by price level.", icon: Layers, keywords: "liquidity volume bids asks" },
  { id: "news", title: "News and economic calendar", short: "News", group: "Markets", description: "Follow releases and market events.", icon: Newspaper, keywords: "calendar economic events" },
  { id: "sessions", title: "Market sessions", short: "Sessions", group: "Markets", description: "Check global trading session hours.", icon: Globe2, keywords: "london new york tokyo sydney hours" },
  { id: "stats", title: "Market stats", short: "Stats", group: "Markets", description: "Review the selected market snapshot.", icon: Activity, keywords: "spread volume high low statistics" },
  { id: "risk", title: "Risk analytics", short: "Risk", group: "Analysis", description: "Review exposure and portfolio risk.", icon: ShieldAlert, keywords: "margin drawdown exposure protection" },
  { id: "performance", title: "Performance dashboard", short: "Performance", group: "Analysis", description: "Analyze trading outcomes and returns.", icon: BarChart2, keywords: "profit loss win rate pnl analytics" },
  { id: "journal", title: "Trade journal", short: "Journal", group: "Analysis", description: "Reflect on trades and trading decisions.", icon: BookOpen, keywords: "notes review strategy" },
  { id: "ai-coach", title: "AI trading guide", short: "AI guide", group: "Analysis", description: "Review context and pre-trade checks.", icon: BrainCircuit, keywords: "coach assistant guidance" },
  { id: "alerts", title: "Price alerts", short: "Alerts", group: "Alerts & support", description: "Create and manage price notifications.", icon: Bell, keywords: "notifications price targets" },
  { id: "smart-alerts", title: "Smart alerts", short: "Smart alerts", group: "Alerts & support", description: "Review account warnings and triggers.", icon: BellRing, keywords: "warnings triggered risk notifications" },
  { id: "trust", title: "Trust and account protection", short: "Protection", group: "Alerts & support", description: "Review account safeguards and status.", icon: ShieldCheck, keywords: "security trust protection account" },
  { id: "support", title: "Support center", short: "Support", group: "Alerts & support", description: "Find help, FAQs, chat, and tickets.", icon: LifeBuoy, keywords: "help faq chat ticket contact" },
] as const

export type ActivityPanelId = typeof ACTIVITY_TOOLS[number]["id"]
export type ActivityCounts = Partial<Record<ActivityPanelId, number>>
export const ACTIVITY_PANEL_TITLES = Object.fromEntries(
  ACTIVITY_TOOLS.map(tool => [tool.id, tool.title]),
) as Record<ActivityPanelId, string>

const GROUPS = ["Trading", "Markets", "Analysis", "Alerts & support"] as const

export function TerminalActivityLauncher({ onOpen, alertCount }: { onOpen: () => void; alertCount: number }) {
  return (
    <div className={cn(styles.mobileBar, styles.theme, "font-sans")}>
      <Button variant="ghost" onClick={onOpen} className={styles.launcher} aria-label="Open activity tools" aria-haspopup="dialog" aria-controls="terminal-activity-tools" aria-keyshortcuts="Alt+A">
        <Grid3X3 data-icon="inline-start" aria-hidden="true" />
        <span>Activity tools</span>
        <span className={styles.launcherHint}>{alertCount > 0 ? `${alertCount} alerts` : `${ACTIVITY_TOOLS.length} tools`}</span>
        <ChevronRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
  )
}

type TerminalActivityNavigationProps = {
  activePanel: ActivityPanelId
  panelOpen: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (panel: ActivityPanelId) => void
  counts: ActivityCounts
  onNewOrder: () => void
  onPositionSizer: () => void
  onResetLayout: () => void
}

export function TerminalActivityNavigation({
  activePanel, panelOpen, open, onOpenChange, onSelect, counts,
  onNewOrder, onPositionSizer, onResetLayout,
}: TerminalActivityNavigationProps) {
  const [expanded, setExpanded] = useState(true)
  const [recent, setRecent] = useState<ActivityPanelId[]>([])
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const directoryRef = useRef<HTMLDivElement>(null)
  const browseRef = useRef<HTMLButtonElement>(null)
  const selectingRef = useRef(false)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.getModifierState("AltGraph")) return
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyA") {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [onOpenChange, open])

  const selectTool = (id: ActivityPanelId) => {
    setRecent(previous => [id, ...previous.filter(item => item !== id)].slice(0, 3))
    selectingRef.current = true
    setQuery("")
    onOpenChange(false)
    onSelect(id)
  }

  const runAction = (action: () => void) => {
    selectingRef.current = true
    setQuery("")
    onOpenChange(false)
    action()
  }

  const renderItem = (tool: typeof ACTIVITY_TOOLS[number], prefix = "tool") => {
    const Icon = tool.icon
    const count = counts[tool.id]
    return (
      <CommandItem
        key={`${prefix}-${tool.id}`}
        value={`${prefix} ${tool.title}`}
        keywords={[tool.keywords, tool.group, tool.description]}
        onSelect={() => selectTool(tool.id)}
        className={styles.toolItem}
      >
        <Icon aria-hidden="true" />
        <span className={styles.itemCopy}>
          <span className={styles.itemTitle}>{tool.title}</span>
          <span className={styles.itemDescription}>{tool.description}</span>
        </span>
        {count !== undefined && <span className={styles.count} aria-label={`${count} items`}>{count > 99 ? "99+" : count}</span>}
        {panelOpen && activePanel === tool.id && <Check aria-label="Current panel" />}
      </CommandItem>
    )
  }

  return (
    <>
      <nav className={cn(styles.rail, styles.theme, expanded && styles.expanded, "font-sans")} aria-label="Trading activity shortcuts">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button ref={browseRef} variant="ghost" className={styles.railButton} onClick={() => onOpenChange(true)} aria-label="Browse all activity tools" aria-haspopup="dialog" aria-expanded={open} aria-controls="terminal-activity-tools" aria-keyshortcuts="Alt+A">
              <Search data-icon="inline-start" aria-hidden="true" />
              {expanded && <span>Find a tool</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">All activity tools · Alt+A</TooltipContent>
        </Tooltip>
        <div className={styles.railScroll}>
          {GROUPS.map(group => (
            <div key={group} className={styles.railGroup} role="group" aria-label={group}>
              {expanded && <span className={styles.groupLabel}>{group}</span>}
              {ACTIVITY_TOOLS.filter(tool => tool.group === group).map(tool => {
                const Icon = tool.icon
                const count = counts[tool.id] ?? 0
                const selected = panelOpen && activePanel === tool.id
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(styles.railButton, selected && styles.selected)}
                        onClick={() => selectTool(tool.id)}
                        aria-label={`Open ${tool.title}${count > 0 ? `, ${count} items` : ""}`}
                        aria-haspopup="dialog"
                        aria-controls="terminal-activity-dialog"
                        aria-expanded={selected}
                      >
                        <Icon data-icon="inline-start" aria-hidden="true" />
                        {expanded && <span>{tool.short}</span>}
                        {count > 0 && <span className={styles.railCount} aria-hidden="true">{count > 99 ? "99+" : count}</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tool.title}<br />{tool.description}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
        <Button variant="ghost" className={styles.railButton} onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Collapse activity rail" : "Expand activity rail"} aria-expanded={expanded}>
          {expanded ? <ChevronLeft data-icon="inline-start" /> : <ChevronRight data-icon="inline-start" />}
          {expanded && <span>Collapse</span>}
        </Button>
      </nav>

      <Dialog open={open} onOpenChange={value => { setQuery(""); onOpenChange(value) }}>
        <DialogContent
          ref={directoryRef}
          id="terminal-activity-tools"
          showCloseButton={false}
          className={cn(styles.directory, styles.theme, "font-sans")}
          style={{ background: "var(--market-watch-background)", color: "var(--market-watch-foreground)" }}
          onOpenAutoFocus={event => {
            event.preventDefault()
            selectingRef.current = false
            if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus()
            else directoryRef.current?.focus()
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            if (selectingRef.current) return
            const mobileLauncher = document.querySelector<HTMLButtonElement>('[aria-label="Open activity tools"]')
            if (mobileLauncher?.getClientRects().length) mobileLauncher.focus()
            else browseRef.current?.focus()
          }}
        >
          <DialogHeader className={styles.directoryHeader}>
            <div className={styles.headingRow}>
              <DialogTitle>Activity tools</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className={styles.closeButton} aria-label="Close activity tools"><X aria-hidden="true" /></Button>
              </DialogClose>
            </div>
            <DialogDescription>Your trading workspace, in one place.</DialogDescription>
          </DialogHeader>
          <Command
            className={styles.command}
            label="Activity tools and workspace actions"
            loop
            filter={(value, search, keywords) => {
              const text = [value, ...(keywords ?? [])].join(" ").toLowerCase()
              return search.trim().toLowerCase().split(/\s+/).every(term => text.includes(term)) ? 1 : 0
            }}
          >
            <CommandInput ref={searchRef} value={query} onValueChange={setQuery} placeholder="Search tools or actions…" aria-label="Search activity tools" />
            <CommandList className={styles.commandList} aria-label="Activity tools and workspace actions">
              <CommandEmpty>No matching tools. Try “risk” or “alerts”.</CommandEmpty>
              {!query && recent.length > 0 && (
                <CommandGroup heading="Recently opened · this session">
                  {recent.map(id => ACTIVITY_TOOLS.find(tool => tool.id === id)).filter((tool): tool is typeof ACTIVITY_TOOLS[number] => Boolean(tool)).map(tool => renderItem(tool, "recent"))}
                </CommandGroup>
              )}
              {GROUPS.map(group => (
                <CommandGroup heading={group} key={group}>
                  {ACTIVITY_TOOLS.filter(tool => tool.group === group).map(tool => renderItem(tool))}
                </CommandGroup>
              ))}
              <CommandGroup heading="Workspace actions">
                <CommandItem value="New order ticket buy sell trade" className={styles.toolItem} onSelect={() => runAction(onNewOrder)}><Plus aria-hidden="true" /><span className={styles.itemCopy}><span className={styles.itemTitle}>New order ticket</span><span className={styles.itemDescription}>Prepare an order. No trade is submitted.</span></span><ArrowRight aria-hidden="true" /></CommandItem>
                <CommandItem value="Position sizer calculator risk lot size" className={styles.toolItem} onSelect={() => runAction(onPositionSizer)}><Calculator aria-hidden="true" /><span className={styles.itemCopy}><span className={styles.itemTitle}>Position sizer</span><span className={styles.itemDescription}>Calculate lot size from your risk budget.</span></span></CommandItem>
                <CommandItem value="Reset workspace panel sizes layout" className={styles.toolItem} onSelect={() => runAction(onResetLayout)}><RotateCcw aria-hidden="true" /><span className={styles.itemCopy}><span className={styles.itemTitle}>Reset panel sizes</span><span className={styles.itemDescription}>Restore the default workspace layout.</span></span></CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
          <footer className={styles.directoryFooter}>
            <span>{ACTIVITY_TOOLS.length} tools · 3 actions</span>
            <span className={styles.keyboardHint}>↑↓ Navigate · Enter Open · Esc Close</span>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  )
}
