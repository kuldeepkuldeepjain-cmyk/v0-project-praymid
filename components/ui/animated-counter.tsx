"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}

export function AnimatedCounter({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)
  const startTime = useRef<number | null>(null)
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  )

  useEffect(() => {
    if (prefersReducedMotion.current) {
      setDisplayValue(value)
      return
    }

    // Only animate on initial render
    if (hasAnimated.current) {
      setDisplayValue(value)
      return
    }

    hasAnimated.current = true

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)

      // Ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = easeOut * value

      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  const formattedValue = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString()

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}
