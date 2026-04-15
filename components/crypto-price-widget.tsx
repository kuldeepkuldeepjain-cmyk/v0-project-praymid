"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useState } from "react"

type CryptoPrice = {
  symbol: string
  name: string
  price: number
  change24h: number
}

export function CryptoPriceWidget() {
  const [prices, setPrices] = useState<CryptoPrice[]>([
    { symbol: "BTC", name: "Bitcoin", price: 97234.56, change24h: 2.34 },
    { symbol: "ETH", name: "Ethereum", price: 3421.89, change24h: -1.23 },
    { symbol: "BNB", name: "BNB", price: 612.45, change24h: 0.87 },
  ])

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
