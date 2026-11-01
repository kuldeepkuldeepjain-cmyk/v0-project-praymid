"use client"

import { useEffect, useId, useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import styles from "./mobile-terminal-controls.module.css"

export type ChartIndicatorKey = "ema9" | "ema21" | "ema50" | "bb" | "rsi" | "macd" | "volume"

const INDICATOR_GROUPS = [
  {
    label: "Chart overlays",
    items: [
      { key: "ema9", label: "EMA 9", description: "Fast moving average" },
      { key: "ema21", label: "EMA 21", description: "Medium moving average" },
      { key: "ema50", label: "EMA 50", description: "Slow moving average" },
      { key: "bb", label: "Bollinger Bands", description: "20-period volatility bands" },
      { key: "volume", label: "Volume", description: "Trading volume bars" },
    ],
  },
  {
    label: "Study pane · choose one",
    items: [
      { key: "rsi", label: "RSI", description: "Relative strength index" },
      { key: "macd", label: "MACD", description: "Momentum and trend" },
    ],
  },
] as const

export function MobileChartIndicators({
  indicators,
  onToggle,
}: {
  indicators: Record<ChartIndicatorKey, boolean>
  onToggle: (key: ChartIndicatorKey) => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const activeCount = Object.values(indicators).filter(Boolean).length

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)")
    const closeOnDesktop = () => { if (!media.matches) setOpen(false) }
    media.addEventListener("change", closeOnDesktop)
    return () => media.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={styles.indicatorTrigger} aria-label="Chart indicators" title={`${activeCount} indicators active`}>
          <SlidersHorizontal aria-hidden="true" />
          <span>Indicators</span>
          <span className={styles.activeCount} aria-hidden="true">{activeCount}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={`${styles.indicatorPanel} font-sans`}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <header className={styles.panelHeader}>
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`}>Indicators</h2>
            <p id={`${id}-description`}>Tap to apply to your chart.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className={styles.closeButton} aria-label="Close indicators">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.indicatorList}>
          {INDICATOR_GROUPS.map((group) => (
            <FieldSet key={group.label} className={styles.indicatorGroup}>
              <FieldLegend className={styles.groupLegend}>{group.label}</FieldLegend>
              <FieldGroup className={styles.indicatorFields}>
                {group.items.map(({ key, label, description }) => (
                  <Field key={key} orientation="horizontal" className={styles.indicatorRow} data-active={indicators[key]}>
                    <FieldLabel htmlFor={`${id}-${key}`} className={styles.indicatorLabel}>
                      <span>{label}</span>
                      <span className={styles.indicatorDescription}>{description}</span>
                    </FieldLabel>
                    <Checkbox id={`${id}-${key}`} checked={indicators[key]} onCheckedChange={() => onToggle(key)} />
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          ))}
        </div>
        <footer className={styles.panelFooter}>
          <span role="status" aria-live="polite">{activeCount} active</span>
          <button type="button" onClick={() => setOpen(false)}>Done</button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
