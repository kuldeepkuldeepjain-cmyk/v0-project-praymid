"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react"

type CryptoPrice = {
  symbol: string
  name: string
  price: number
  change24h: number
}

export function CryptoPriceWidget() {
  const [prices, setPrices] = useState<CryptoPrice[]>([
    { symbol: "BTC", name: "Bitcoin", price: 0, change24h: 0 },
    { symbol: "ETH", name: "Ethereum", price: 0, change24h: 0 },
    { symbol: "BNB", name: "BNB", price: 0, change24h: 0 },
  ])

  useEffect(() => {
    let active = true
    const fetchPrices = async () => {
      try {
        const response = await fetch("/api/crypto/rates", { cache: "no-store" })
        if (!response.ok) return
        const json = await response.json() as { rates?: CryptoPrice[] }
        if (active && json.rates?.length) setPrices((current) => current.map((item) => json.rates?.find((rate) => rate.symbol === item.symbol) ? { ...item, ...json.rates.find((rate) => rate.symbol === item.symbol) } : item))
      } catch {}
    }
    void fetchPrices()
    const timer = window.setInterval(fetchPrices, 1_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Crypto Prices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prices.map((crypto) => (
          <div key={crypto.symbol} className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{crypto.symbol}</div>
              <div className="text-xs text-muted-foreground">{crypto.name}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-semibold">${crypto.price.toLocaleString()}</div>
              <div
                className={`flex items-center justify-end text-xs ${crypto.change24h >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {crypto.change24h >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(crypto.change24h).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
