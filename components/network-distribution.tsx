"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import type { Payment } from "@/lib/types"
import { BSC_CONFIG, ETH_CONFIG } from "@/lib/constants"

type NetworkDistributionProps = {
  payments: Payment[]
}

export function NetworkDistribution({ payments }: NetworkDistributionProps) {
  const bscCount = payments.filter((p) => p.chain === "BSC").length
  const ethCount = payments.filter((p) => p.chain === "ETH").length

  const data = [
    { name: "BSC", value: bscCount, color: BSC_CONFIG.COLOR },
    { name: "ETH", value: ethCount, color: ETH_CONFIG.COLOR },
  ]

  const total = bscCount + ethCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Network Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No data available</div>
        ) : (
          <div className="space-y-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: BSC_CONFIG.COLOR }}>
                  {bscCount}
                </div>
                <div className="text-xs text-muted-foreground">BSC Payments</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: ETH_CONFIG.COLOR }}>
                  {ethCount}
                </div>
                <div className="text-xs text-muted-foreground">ETH Payments</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
