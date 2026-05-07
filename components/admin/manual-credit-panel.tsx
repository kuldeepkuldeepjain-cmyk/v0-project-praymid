"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign, Send, Loader2, CheckCircle2, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAdminToken } from "@/lib/auth"

export function ManualCreditPanel() {
  const { toast } = useToast()
  const [userEmail, setUserEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleManualCredit = async () => {
    if (!userEmail.trim() || !amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid email and amount",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const token = getAdminToken()
      const response = await fetch("/api/admin/manual-credit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail.trim(),
          amount: Number.parseFloat(amount),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to credit wallet")
      }

      const data = await response.json()

      toast({
        title: "Credit Successful",
        description: `$${amount} has been credited to ${userEmail}`,
      })

      setUserEmail("")
      setAmount("")
    } catch (error) {
      console.error("Manual credit error:", error)
      toast({
        title: "Error",
        description: "Failed to credit wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-300 to-teal-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="relative bg-gradient-to-br from-white/95 via-emerald-50/30 to-cyan-50/30 backdrop-blur-sm border-emerald-200/50 shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-emerald-200/30 pb-4 bg-gradient-to-r from-emerald-50/50 to-cyan-50/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-300/50">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Manual Credit</CardTitle>
              <CardDescription className="text-slate-600">Credit funds directly to user wallet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
        <div className="space-y-5">
          <div>
            <Label className="text-slate-700 font-semibold mb-2 block flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-500" />
              User Email
            </Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="bg-gradient-to-r from-white to-emerald-50/30 border-emerald-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl h-12 transition-all duration-300 hover:border-emerald-300"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-semibold mb-2 block flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-500" />
              Amount ($)
            </Label>
            <Input
              type="number"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="bg-gradient-to-r from-white to-teal-50/30 border-teal-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:ring-teal-400/20 rounded-xl h-12 transition-all duration-300 hover:border-teal-300"
            />
          </div>

          <Button
            onClick={handleManualCredit}
            disabled={isProcessing || !userEmail.trim() || !amount}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-emerald-300/50 hover:shadow-xl hover:shadow-emerald-400/50 rounded-xl h-14 text-base font-semibold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Send to User Wallet
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
