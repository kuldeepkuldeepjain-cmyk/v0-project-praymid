"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { BSC_CONFIG, ETH_CONFIG } from "@/lib/constants"
import { useEffect, useState } from "react"
import type { CollectionHistory as CollectionHistoryType } from "@/lib/types"

export function CollectionHistory() {
  const [collections, setCollections] = useState<CollectionHistoryType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const token = localStorage.getItem("admin_token")
        const response = await fetch("/api/admin/collections", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setCollections(data.collections || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching collections:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()
  }, [])

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getExplorerUrl = (chain: string, txHash: string) => {
    const config = chain === "BSC" ? BSC_CONFIG : ETH_CONFIG
    return `${config.EXPLORER}/tx/${txHash}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Collections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
        ) : collections.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No collections yet</div>
        ) : (
          collections.map((collection) => {
            const config = collection.chain === "BSC" ? BSC_CONFIG : ETH_CONFIG
            return (
              <div
                key={collection.id}
                className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono">{truncateAddress(collection.user_address)}</code>
                    <Badge
                      variant="outline"
                      style={{ borderColor: config.COLOR, color: config.COLOR }}
                      className="text-xs"
                    >
                      {collection.chain}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold">${collection.amount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(collection.created_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => window.open(getExplorerUrl(collection.chain, collection.tx_hash), "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
