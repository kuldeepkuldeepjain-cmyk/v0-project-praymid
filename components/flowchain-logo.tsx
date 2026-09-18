"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

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
      <Image
        src="/elite-fund-logo.jpg"
        alt="Elite Fund — Trade Higher"
        width={logoWidth}
        height={logoHeight}
        className={cn("object-contain", variant === "icon" ? "aspect-square object-cover object-top" : "")}
        priority
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
      <Image
        src="/elite-fund-logo.jpg"
        alt="Elite Fund"
        width={iconSize}
        height={iconSize}
        className="object-cover object-top"
        priority
      />
    </div>
  )
}
