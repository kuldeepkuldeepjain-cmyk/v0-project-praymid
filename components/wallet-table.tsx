"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Eye, ArrowUpDown } from "lucide-react"
import { BSC_CONFIG, ETH_CONFIG } from "@/lib/constants"
import type { Payment, AllowanceInfo, SortField, SortOrder } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

type WalletTableProps = {
  payments: Payment[]
  allowances: Record<string, AllowanceInfo>
  onViewDetails: (payment: Payment) => void
  onCollect: (payment: Payment) => void
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}

export function WalletTable({
  payments,
  allowances,
  onViewDetails,
  onCollect,
  sortField,
  sortOrder,
  onSort,
}: WalletTableProps) {
  const { toast } = useToast()
  const [collectingId, setCollectingId] = useState<string | null>(null)

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    })
  }

  const getExplorerUrl = (chain: string, address: string) => {
    const config = chain === "BSC" ? BSC_CONFIG : ETH_CONFIG
    return `${config.EXPLORER}/address/${address}`
  }

  const handleCollect = async (payment: Payment) => {
    setCollectingId(payment.id)
    try {
      await onCollect(payment)
    } finally {
      setCollectingId(null)
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button variant="ghost" size="sm" onClick={() => onSort(field)} className="h-8 px-2">
      {label}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="address" label="Wallet Address" />
            </TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Payment Amount</TableHead>
            <TableHead>
              <SortButton field="balance" label="Current Balance" />
            </TableHead>
            <TableHead>Allowance</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>
              <SortButton field="date" label="Date" />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => {
              const allowance = allowances[payment.user_address] || {
                balance: "0",
                allowance: "0",
                available: "0",
              }
              const config = payment.chain === "BSC" ? BSC_CONFIG : ETH_CONFIG

              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      <a
                        href={getExplorerUrl(payment.chain, payment.user_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {truncateAddress(payment.user_address)}
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(payment.user_address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{ borderColor: config.COLOR, color: config.COLOR }}>
                      {payment.chain}
                    </Badge>
                  </TableCell>
                  <TableCell>${payment.amount.toLocaleString()}</TableCell>
                  <TableCell>${allowance.balance}</TableCell>
                  <TableCell>${allowance.allowance}</TableCell>
                  <TableCell className="font-semibold">${allowance.available}</TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payment.status === "collected"
                          ? "default"
                          : payment.status === "approved"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => onViewDetails(payment)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {payment.status === "approved" && Number.parseFloat(allowance.available) > 0 && (
                        <Button size="sm" onClick={() => handleCollect(payment)} disabled={collectingId === payment.id}>
                          {collectingId === payment.id ? "Collecting..." : "Collect"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
