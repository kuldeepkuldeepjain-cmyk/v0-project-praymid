"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Wallet, Link2, Unlink, Copy, Check, Shield, AlertTriangle, ChevronRight, Zap } from "lucide-react"

interface ConnectedWallet {
  address: string
  network: "ETH" | "BSC" | "POLYGON" | "ARBITRUM"
  balance: number
  isDefault: boolean
  connectedAt: string
}

interface WalletIntegrationProps {
  wallets?: ConnectedWallet[]
  onConnectWallet?: (network: string) => void
  onDisconnectWallet?: (address: string) => void
  onSetDefault?: (address: string) => void
}

const networkConfig = {
  ETH: { name: "Ethereum", color: "#627eea", icon: "ETH" },
  BSC: { name: "BNB Smart Chain", color: "#f3ba2f", icon: "BNB" },
  POLYGON: { name: "Polygon", color: "#8247e5", icon: "MATIC" },
  ARBITRUM: { name: "Arbitrum", color: "#28a0f0", icon: "ARB" },
}

export function WalletIntegration({
  wallets = [],
  onConnectWallet,
  onDisconnectWallet,
  onSetDefault,
}: WalletIntegrationProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [manualAddress, setManualAddress] = useState("")

  const handleConnect = async (network: string) => {
    setSelectedNetwork(network)
    setIsConnecting(true)

    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (onConnectWallet) {
      onConnectWallet(network)
    }

    setIsConnecting(false)
    setShowConnectDialog(false)
    setSelectedNetwork(null)
  }

  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

  return (
    <>
      <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#22d3ee] to-[#06b6d4] flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              Wallet Integration
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowConnectDialog(true)}
              className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#111827]"
            >
              <Link2 className="h-4 w-4 mr-1" />
              Connect
            </Button>
          </div>
          <CardDescription className="text-[#9ca3af]">
            Connect external wallets to receive payouts automatically
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Total Balance */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#7c3aed]/20 to-[#22d3ee]/20 border border-[#7c3aed]/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9ca3af]">Total Balance</p>
                <p className="text-3xl font-bold text-white">${totalBalance.toFixed(2)}</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#06b6d4] flex items-center justify-center">
                <Wallet className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          {/* Connected Wallets */}
          {wallets.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[#9ca3af]">Connected Wallets</h4>
              {wallets.map((wallet) => {
                const network = networkConfig[wallet.network]
                return (
                  <div
                    key={wallet.address}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      wallet.isDefault
                        ? "bg-[#22d3ee]/10 border-[#22d3ee]/30"
                        : "bg-[#111827]/50 border-[#374151] hover:border-[#7c3aed]/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: network.color }}
                      >
                        {network.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{network.name}</h4>
                          {wallet.isDefault && (
                            <Badge className="bg-[#22d3ee]/20 text-[#22d3ee] border-0 text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-[#9ca3af] font-mono">{formatAddress(wallet.address)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-[#6b7280] hover:text-[#22d3ee]"
                            onClick={() => handleCopyAddress(wallet.address)}
                          >
                            {copiedAddress === wallet.address ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-white">${wallet.balance.toFixed(2)}</p>
                        <p className="text-xs text-[#9ca3af]">USDT</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!wallet.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#6b7280] hover:text-[#22d3ee]"
                            onClick={() => onSetDefault?.(wallet.address)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#6b7280] hover:text-[#ef4444]"
                          onClick={() => onDisconnectWallet?.(wallet.address)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#111827]/50 border border-[#374151] text-center">
              <Wallet className="h-12 w-12 text-[#6b7280] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Wallets Connected</h3>
              <p className="text-sm text-[#9ca3af] mb-4">Connect your external wallet to receive automatic payouts</p>
              <Button
                onClick={() => setShowConnectDialog(true)}
                className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#111827]"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          )}

          {/* Security Notice */}
          <Alert className="bg-[#f59e0b]/10 border-[#f59e0b]/30">
            <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
            <AlertDescription className="text-[#9ca3af]">
              Always verify wallet addresses before connecting. FlowChain will never ask for your private keys.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Connect Wallet Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="bg-[#1e1b4b] border-[#374151] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#22d3ee]" />
              Connect Wallet
            </DialogTitle>
            <DialogDescription className="text-[#9ca3af]">Choose a network and connect your wallet</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Network Selection */}
            <div className="space-y-2">
              <Label className="text-[#9ca3af]">Select Network</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(networkConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className={`h-auto p-3 flex flex-col items-center gap-2 ${
                      selectedNetwork === key
                        ? "border-[#22d3ee] bg-[#22d3ee]/10"
                        : "border-[#374151] hover:border-[#7c3aed]"
                    }`}
                    onClick={() => setSelectedNetwork(key)}
                  >
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.icon}
                    </div>
                    <span className="text-xs text-[#9ca3af]">{config.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual Address Input */}
            <div className="space-y-2">
              <Label className="text-[#9ca3af]">Or enter wallet address manually</Label>
              <Input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="0x..."
                className="bg-[#111827] border-[#374151] text-white"
              />
            </div>

            {/* Connect Options */}
            <div className="space-y-2">
              <Label className="text-[#9ca3af]">Connect with</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 border-[#374151] hover:border-[#7c3aed] text-white bg-transparent"
                  disabled={!selectedNetwork || isConnecting}
                  onClick={() => selectedNetwork && handleConnect(selectedNetwork)}
                >
                  <span className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-[#f59e0b] flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    MetaMask
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 border-[#374151] hover:border-[#7c3aed] text-white bg-transparent"
                  disabled={!selectedNetwork || isConnecting}
                >
                  <span className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-[#3b99fc] flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                    WalletConnect
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 border-[#374151] hover:border-[#7c3aed] text-white bg-transparent"
                  disabled={!selectedNetwork || isConnecting}
                >
                  <span className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-[#0052ff] flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                    Coinbase Wallet
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConnectDialog(false)}
              className="border-[#374151] text-[#9ca3af] hover:text-white"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
