"use client"

import { ForexTradingPlatform } from "@/components/forex-trading-platform"

export default function TerminalPreviewPage() {
  return (
    <div className="elite-terminal-workspace">
      <div className="elite-terminal-platform">
        <ForexTradingPlatform participantEmail="demo@elitefund.com" walletBalance={100000} />
      </div>
    </div>
  )
}
