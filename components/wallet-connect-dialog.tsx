"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"

interface WalletConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  recipientAddress: string
  onSuccess: (txHash: string) => void
}

export function WalletConnectDialog({
  open,
  onOpenChange,
  amount,
  recipientAddress,
  onSuccess,
}: WalletConnectDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  useEffect(() => {
    if (open) {
      checkWalletConnection()
    }
  }, [open])

  const checkWalletConnection = async () => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          setIsConnected(true)
        }
      } catch (err) {
        // Silently fail - wallet not connected yet
        console.log("[v0] Wallet not connected yet")
      }
    }
  }

  const connectWallet = async () => {
    setError("")
    setIsConnecting(true)

    try {
      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        setError("MetaMask is not installed. Please install MetaMask to continue.")
        setIsConnecting(false)
        return
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setIsConnected(true)
      }
    } catch (err: any) {
      console.log("[v0] Wallet connection error:", err.code, err.message)
      if (err.code === 4001) {
        setError("Connection rejected. Please approve the connection request in your wallet.")
      } else if (err.code === -32002) {
        setError("Connection request pending. Please check your wallet.")
      } else {
        setError("Failed to connect wallet. Please try again.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const sendTransaction = async () => {
    setError("")
    setIsSending(true)

    try {
      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        setError("Wallet not connected. Please refresh and try again.")
        setIsSending(false)
        return
      }

      // Convert amount to Wei (assuming USDT with 6 decimals)
      const amountInWei = (amount * 1e6).toString(16)

      // Send transaction
      const transactionHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: recipientAddress,
            value: "0x0", // USDT transfer uses contract call, not ETH value
            data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, "0")}${amountInWei.padStart(64, "0")}`,
          },
        ],
      })

      setTxHash(transactionHash)
      onSuccess(transactionHash)
    } catch (err: any) {
      console.log("[v0] Transaction error:", err.code, err.message)
      if (err.code === 4001) {
        setError("Transaction rejected. Please approve the transaction in your wallet.")
      } else {
        setError(err.message || "Transaction failed. Please try again.")
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            Connect Wallet for Withdrawal
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Connect your wallet to approve and receive your withdrawal of ${amount.toFixed(2)} USDT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isConnected ? (
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-medium text-slate-900 mb-2">What you'll need:</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    MetaMask or compatible Web3 wallet installed
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    Sufficient ETH for gas fees
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    Connected to the correct network (Ethereum/BSC)
                  </li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full h-12 bg-[#E85D3B] hover:bg-[#d14d2c] text-white font-semibold"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </>
          ) : txHash ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Transaction Submitted!</h3>
              <p className="text-sm text-slate-600 mb-4">Your withdrawal has been submitted to the blockchain.</p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
                <p className="text-xs text-slate-500 mb-1">Transaction Hash:</p>
                <code className="text-xs text-purple-600 break-all">{txHash}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => window.open(`https://etherscan.io/tx/${txHash}`, "_blank")}
              >
                View on Explorer
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-1">Wallet Connected</p>
                    <code className="text-xs text-slate-600 break-all">{walletAddress}</code>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-semibold text-slate-900">${amount.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">To Address:</span>
                    <code className="font-mono text-xs text-purple-600">{recipientAddress.slice(0, 10)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Network:</span>
                    <span className="font-medium text-slate-900">Ethereum Mainnet</span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={sendTransaction}
                  disabled={isSending}
                  className="flex-1 bg-[#E85D3B] hover:bg-[#d14d2c] text-white"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Approve & Send"
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500">
                You'll be asked to approve this transaction in your wallet
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
