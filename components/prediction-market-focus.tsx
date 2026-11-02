"use client"

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssetLogo } from "@/components/asset-logo"

export type PredictionMarketAsset = {
  symbol: string
  displayName: string
  name: string
  logo: string
  iconBg: string
  chartUrl: string
  type: "crypto" | "commodity" | "forex"
}

type PriceSnapshot = {
  price?: number
  change?: number
  volume?: number
}

type PredictionMarketFocusProps = {
  asset: PredictionMarketAsset | null
  priceData?: PriceSnapshot
  hasActiveTrade: boolean
  isFeedFresh: boolean
  compact?: boolean
  onTrade: (direction: "up" | "down") => void
}

function formatVolume(volume?: number) {
  if (!volume || !Number.isFinite(volume)) return "—"
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
  return `$${(volume / 1e3).toFixed(2)}K`
}

export function PredictionMarketFocus({
  asset,
  priceData,
  hasActiveTrade,
  isFeedFresh,
  compact = false,
  onTrade,
}: PredictionMarketFocusProps) {
  if (!asset) return null

  const hasPrice = typeof priceData?.price === "number" && Number.isFinite(priceData.price) && priceData.price > 0
  const change = typeof priceData?.change === "number" && Number.isFinite(priceData.change) ? priceData.change : 0
  const isPositive = change >= 0
  const accent = isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)"
  const feedLabel = !hasPrice ? "Connecting" : isFeedFresh ? "Live feed" : "Delayed"
  const feedColor = !hasPrice || !isFeedFresh ? "var(--brand-primary)" : "var(--terminal-graphite-positive)"
  const typeLabel = asset.type === "crypto" ? "Crypto" : asset.type === "commodity" ? "Commodity" : "Forex"
  const titleId = `prediction-focus-title-${compact ? "mobile" : "desktop"}`
  const upStyle = {
    backgroundColor: "color-mix(in srgb, var(--terminal-graphite-positive) 14%, var(--terminal-graphite-surface))",
    borderColor: "color-mix(in srgb, var(--terminal-graphite-positive) 48%, var(--terminal-graphite-border))",
    color: "var(--terminal-graphite-positive)",
  }
  const downStyle = {
    backgroundColor: "color-mix(in srgb, var(--terminal-graphite-negative) 14%, var(--terminal-graphite-surface))",
    borderColor: "color-mix(in srgb, var(--terminal-graphite-negative) 48%, var(--terminal-graphite-border))",
    color: "var(--terminal-graphite-negative)",
  }

  return (
    <section aria-labelledby={titleId} className="terminal-panel min-w-0 overflow-hidden rounded-2xl">
      <header
        className={`flex items-center justify-between gap-3 border-b ${compact ? "px-4 py-3" : "px-5 py-4"}`}
        style={{ borderColor: "var(--terminal-graphite-border)" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary)]">Selected market</p>
          <h3 id={titleId} className="mt-1 text-base font-semibold text-[var(--terminal-graphite-text)]">Market overview</h3>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{
            borderColor: `color-mix(in srgb, ${feedColor} 40%, var(--terminal-graphite-border))`,
            backgroundColor: `color-mix(in srgb, ${feedColor} 10%, var(--terminal-graphite-surface))`,
            color: feedColor,
          }}
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: feedColor }} />
          {feedLabel}
        </span>
      </header>

      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetLogo
            symbol={asset.symbol}
            name={asset.name}
            logoUrl={asset.logo}
            bgColor={asset.iconBg}
            size={compact ? 44 : 48}
            className="shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-[var(--terminal-graphite-text)]">{asset.displayName}</p>
            <p className="truncate text-sm text-[var(--terminal-graphite-muted)]">{asset.name}</p>
          </div>
          {hasActiveTrade && (
            <span
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: "color-mix(in srgb, var(--brand-primary) 40%, var(--terminal-graphite-border))",
                backgroundColor: "color-mix(in srgb, var(--brand-primary) 12%, var(--terminal-graphite-surface))",
                color: "var(--brand-primary)",
              }}
            >
              Active
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--terminal-graphite-muted)]">Current price</p>
          <p className={`price-mono mt-1 font-mono font-semibold tracking-tight text-[var(--terminal-graphite-text)] ${compact ? "text-3xl" : "text-4xl"}`}>
            {hasPrice ? `$${priceData.price!.toFixed(priceData.price! < 1 ? 6 : 2)}` : "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: hasPrice ? accent : "var(--terminal-graphite-muted)" }}>
              {hasPrice ? (isPositive ? <TrendingUp aria-hidden="true" className="size-4" /> : <TrendingDown aria-hidden="true" className="size-4" />) : null}
              {hasPrice ? `${isPositive ? "+" : ""}${change.toFixed(2)}%` : "Waiting for quote"}
            </span>
            {hasPrice && <span className="text-[var(--terminal-graphite-muted)]">24h change</span>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="terminal-panel-raised min-w-0 rounded-xl p-3">
            <p className="text-xs text-[var(--terminal-graphite-muted)]">Market type</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--terminal-graphite-text)]">{typeLabel}</p>
          </div>
          <div className="terminal-panel-raised min-w-0 rounded-xl p-3">
            <p className="text-xs text-[var(--terminal-graphite-muted)]">24h volume</p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-[var(--terminal-graphite-text)]">
              {formatVolume(priceData?.volume)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrice}
            onClick={() => onTrade("up")}
            aria-label={`Open an up prediction for ${asset.displayName}`}
            className="h-11 rounded-xl border font-semibold"
            style={upStyle}
          >
            <ArrowUp aria-hidden="true" data-icon="inline-start" />
            UP
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasPrice}
            onClick={() => onTrade("down")}
            aria-label={`Open a down prediction for ${asset.displayName}`}
            className="h-11 rounded-xl border font-semibold"
            style={downStyle}
          >
            <ArrowDown aria-hidden="true" data-icon="inline-start" />
            DOWN
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs text-[var(--terminal-graphite-muted)]">
            {compact ? "Opens a review ticket before placing." : "Your prediction is reviewed before it is placed."}
          </p>
          <a
            href={asset.chartUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${asset.displayName} chart in a new tab`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-semibold text-[var(--brand-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
          >
            Chart
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}
