"use client"

import { useId } from "react"
import { ArrowUpDown, Minus, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const actionClass = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#263b4f] bg-[#122234] px-2 text-xs font-semibold text-slate-200 hover:border-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] disabled:opacity-50"

export function TradingChartPriceScale({
  visible,
  hasData,
  onToggleVisible,
  onZoom,
  onAutoFit,
}: {
  visible: boolean
  hasData: boolean
  onToggleVisible: () => void
  onZoom: (factor: number) => void
  onAutoFit: () => void
}) {
  const headingId = useId()
  const descriptionId = useId()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-price-scale-trigger
          aria-label="Price scale"
          title="Price scale settings"
          className="inline-flex h-6 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-[#263b4f] bg-[#122234] px-2 font-semibold text-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
        >
          <ArrowUpDown aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="text-[10px]">Scale</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={12}
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="w-56 rounded-xl border-[#263b4f] bg-[#0d1724] p-3 text-slate-100 shadow-xl"
      >
        <div className="flex flex-col gap-2.5">
          <div>
            <h3 id={headingId} className="text-sm font-semibold">Price scale</h3>
            <p id={descriptionId} className="mt-1 text-xs leading-snug text-slate-400">
              Drag the price axis up or down to zoom vertically.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" disabled={!hasData} onClick={() => onZoom(1.25)} className={actionClass}>
              <Minus aria-hidden="true" className="size-3.5" /> Zoom out
            </button>
            <button type="button" disabled={!hasData} onClick={() => onZoom(0.8)} className={actionClass}>
              <Plus aria-hidden="true" className="size-3.5" /> Zoom in
            </button>
            <button type="button" disabled={!hasData} onClick={onAutoFit} className={actionClass}>
              Auto fit
            </button>
            <button type="button" onClick={onToggleVisible} className={actionClass}>
              {visible ? "Hide axis" : "Show axis"}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
