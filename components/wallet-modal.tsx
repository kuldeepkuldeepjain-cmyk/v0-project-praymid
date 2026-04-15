"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import type { Payment, AllowanceInfo } from "@/lib/types"
import { BSC_CONFIG, ETH_CONFIG } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

type WalletModalProps = {
  payment: Payment | null
  allowance: AllowanceInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletModal({ payment, allowance, open, onOpenChange }: WalletModalProps) {
  const { toast } = useToast()

  if (!payment) return null

  const config = payment.chain === "BSC" ? BSC_CONFIG : ETH_CONFIG

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wallet Details</DialogTitle>
          <DialogDescription>Complete information for this wallet</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet Address */}
          <div>
            <h3 className="text-sm font-medium mb-2">Wallet Address</h3>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <code className="flex-1 text-sm font-mono break-all">{payment.user_address}</code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(payment.user_address)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`${config.EXPLORER}/address/${payment.user_address}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Network Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Network</h3>
              <Badge variant="outline" style={{ borderColor: config.COLOR, color: config.COLOR }}>
                {payment.chain}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Chain ID</h3>
              <p className="text-sm">{config.CHAIN_ID}</p>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Payment Amount</h3>
              <p className="text-lg font-semibold">${payment.amount.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Status</h3>
              <Badge
                variant={
                  payment.status === "collected" ? "default" : payment.status === "approved" ? "secondary" : "outline"
                }
              >
                {payment.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Balance Details */}
          {allowance && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Current Balance</h3>
                <p className="text-lg font-semibold">${allowance.balance}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Allowance</h3>
                <p className="text-lg font-semibold">${allowance.allowance}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Available to Collect</h3>
                <p className="text-lg font-semibold text-green-500">${allowance.available}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Created At</h3>
              <p className="text-sm">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
            {payment.approved_at && (
              <div>
                <h3 className="text-sm font-medium mb-2">Approved At</h3>
                <p className="text-sm">{new Date(payment.approved_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Contract Addresses */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium mb-2">USDT Contract</h3>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted p-2 rounded flex-1">{config.USDT_CONTRACT}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(config.USDT_CONTRACT)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Token Collector</h3>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted p-2 rounded flex-1">{config.TOKEN_COLLECTOR}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(config.TOKEN_COLLECTOR)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
