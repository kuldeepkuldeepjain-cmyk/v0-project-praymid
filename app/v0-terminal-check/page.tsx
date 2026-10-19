"use client"

import { ForexTradingPlatform } from "@/components/forex-trading-platform"

export default function TerminalLayoutCheck() {
  return (
    <div style={{ height: "100dvh", width: "100%" }}>
      <ForexTradingPlatform participantEmail="layout-check@example.com" walletBalance={1000} />
    </div>
  )
}
