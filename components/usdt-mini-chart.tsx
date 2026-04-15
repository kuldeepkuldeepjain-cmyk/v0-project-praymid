"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { useState } from "react"

export function USDTMiniChart() {
  const [priceData, setPriceData] = useState([
    { time: "00:00", price: 1.0 },
    { time: "04:00", price: 0.9998 },
    { time: "08:00", price: 1.0002 },
    { time: "12:00", price: 0.9999 },
    { time: "16:00", price: 1.0001 },
    { time: "20:00", price: 1.0 },
    { time: "24:00", price: 1.0003 },
  ])

  const [currentPrice] = useState(1.0003)
  const [change24h] = useState(0.03)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">USDT Price</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">${currentPrice.toFixed(4)}</div>
            <div className={`flex items-center text-sm ${change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
              {change24h >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {Math.abs(change24h).toFixed(2)}%
            </div>
          </div>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={change24h >= 0 ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground">Last 24 hours</div>
        </div>
      </CardContent>
    </Card>
  )
}
