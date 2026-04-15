"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface FlowChainLogoProps {
  variant?: "full" | "icon" | "wordmark" | "horizontal"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showTagline?: boolean
}

// Updated to use new handshake partnership logo
export function FlowChainLogo({ variant = "full", size = "md", className, showTagline = true }: FlowChainLogoProps) {
  const sizes = {
    xs: { icon: 24, text: "text-sm", tagline: "text-[8px]", gap: "gap-2" },
    sm: { icon: 32, text: "text-lg", tagline: "text-[10px]", gap: "gap-2" },
    md: { icon: 40, text: "text-xl", tagline: "text-xs", gap: "gap-3" },
    lg: { icon: 56, text: "text-2xl", tagline: "text-sm", gap: "gap-4" },
    xl: { icon: 72, text: "text-4xl", tagline: "text-base", gap: "gap-5" },
  }

  const { icon: iconSize, text: textSize, tagline: taglineSize, gap } = sizes[size]

  // New partnership handshake logo
  const LogoIcon = () => (
    <div className="relative shrink-0" style={{ width: iconSize, height: iconSize }}>
      <Image
        src="/images/screenshot-202026-01-14-20094137.png"
        alt="FlowChain Logo"
        width={iconSize}
        height={iconSize}
        className="object-contain mix-blend-multiply px-0"
        priority
      />
    </div>
  )

  // Official wordmark - coral/orange color with tracking
  const Wordmark = () => (
    <div className="flex flex-col">
      <span className={cn("font-bold tracking-[0.2em] uppercase", textSize, "text-[#E85D3B]")}>FLOWCHAIN</span>
      {showTagline && (
        <span className={cn("font-medium tracking-[0.15em] uppercase", taglineSize, "text-[#22d3ee]")}>
          Connect & Grow
        </span>
      )}
    </div>
  )

  if (variant === "icon") {
    return (
      <div className={cn("inline-flex", className)}>
        <LogoIcon />
      </div>
    )
  }

  if (variant === "wordmark") {
    return (
      <div className={cn("inline-flex", className)}>
        <Wordmark />
      </div>
    )
  }

  // Full logo with icon and wordmark
  return (
    <div className={cn("inline-flex items-center", gap, className)}>
      <LogoIcon />
      <Wordmark />
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
      <Image
        src="/images/screenshot-202026-01-14-20094137.png"
        alt="FlowChain"
        width={iconSize}
        height={iconSize}
        className="object-contain mix-blend-multiply"
        priority
      />
    </div>
  )
}
