"use client"

import { cn } from "@/lib/utils"

const ELITE_FUND_LOGO_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/7e62b303-6ca6-4561-b26a-1d2c98350071-DrAR4HbibRDvHK7ScdMNeSRXrHy2Sq.png"

interface FlowChainLogoProps {
  variant?: "full" | "icon" | "wordmark" | "horizontal"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showTagline?: boolean
}

export function FlowChainLogo({ variant = "full", size = "md", className, showTagline = true }: FlowChainLogoProps) {
  const sizes = { xs: 120, sm: 170, md: 230, lg: 300, xl: 380 }
  const logoWidth = sizes[size]
  const logoHeight = Math.round(logoWidth * 0.96)

  return (
    <div className={cn("inline-flex overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ELITE_FUND_LOGO_URL}
        alt="Elite Fund — Trade Higher"
        width={logoWidth}
        height={logoHeight}
        className={cn("object-contain", variant === "icon" ? "aspect-square object-cover object-top" : "")}
        loading="eager"
      />
    </div>
  )

}

// Compact version for tight spaces
export function FlowChainLogoCompact({
  size = "md",
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}) {
  const sizes = { xs: 20, sm: 28, md: 36, lg: 48 }
  const iconSize = sizes[size]

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: iconSize, height: iconSize }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ELITE_FUND_LOGO_URL}
        alt="Elite Fund"
        width={iconSize}
        height={iconSize}
        className="object-cover object-top"
        loading="eager"
      />
    </div>
  )
}
