"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Calendar, CheckCircle2, AlertTriangle, Settings, Zap, Wallet } from "lucide-react"

interface PayoutSchedule {
  enabled: boolean
  frequency: "daily" | "weekly" | "monthly" | "threshold"
  threshold?: number
  dayOfWeek?: number
  dayOfMonth?: number
  nextPayout?: string
}

interface AutoPayoutProps {
  currentBalance?: number
  payoutSchedule?: PayoutSchedule
  minimumPayout?: number
  defaultWallet?: string
  onUpdateSchedule?: (schedule: PayoutSchedule) => void
  onManualPayout?: () => void
}

export function AutoPayout({
  currentBalance = 0,
  payoutSchedule = {
    enabled: false,
    frequency: "weekly",
    dayOfWeek: 1,
    nextPayout: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  minimumPayout = 50,
  defaultWallet = "0x1234...5678",
  onUpdateSchedule,
  onManualPayout,
}: AutoPayoutProps) {
  const [schedule, setSchedule] = useState<PayoutSchedule>(payoutSchedule)
  const [threshold, setThreshold] = useState(100)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleToggle = (enabled: boolean) => {
    const newSchedule = { ...schedule, enabled }
    setSchedule(newSchedule)
    onUpdateSchedule?.(newSchedule)
  }

  const handleFrequencyChange = (frequency: PayoutSchedule["frequency"]) => {
    const newSchedule = { ...schedule, frequency }
    if (frequency === "threshold") {
      newSchedule.threshold = threshold
    }
    setSchedule(newSchedule)
    onUpdateSchedule?.(newSchedule)
  }

  const handleManualPayout = async () => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    onManualPayout?.()
    setIsProcessing(false)
  }

  const canPayout = currentBalance >= minimumPayout

  const getNextPayoutDate = () => {
    if (!schedule.enabled) return "Disabled"
    if (schedule.frequency === "threshold") return `When balance reaches $${schedule.threshold}`
    return new Date(schedule.nextPayout || Date.now()).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ea580c] flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
            Auto-Payout System
          </CardTitle>
          <Switch checked={schedule.enabled} onCheckedChange={handleToggle} />
        </div>
        <CardDescription className="text-[#9ca3af]">
          Configure automatic payouts to your connected wallet
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#7c3aed]/20 to-[#22d3ee]/20 border border-[#7c3aed]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9ca3af]">Available Balance</p>
              <p className="text-3xl font-bold text-white">${currentBalance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#9ca3af]">Minimum Payout</p>
              <p className="text-lg font-semibold text-[#22d3ee]">${minimumPayout}</p>
            </div>
          </div>
          {!canPayout && (
            <div className="mt-3 flex items-center gap-2 text-[#f59e0b]">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Need ${(minimumPayout - currentBalance).toFixed(2)} more for payout</span>
            </div>
          )}
        </div>

        {/* Payout Configuration */}
        <div className="space-y-4 p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
          <div className="flex items-center gap-2 text-white">
            <Settings className="h-4 w-4 text-[#22d3ee]" />
            <span className="font-medium">Payout Settings</span>
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <Label className="text-[#9ca3af]">Payout Frequency</Label>
            <Select
              value={schedule.frequency}
              onValueChange={(value) => handleFrequencyChange(value as PayoutSchedule["frequency"])}
              disabled={!schedule.enabled}
            >
              <SelectTrigger className="bg-[#1f2937] border-[#374151] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1f2937] border-[#374151]">
                <SelectItem value="daily" className="text-white hover:bg-[#374151]">
                  Daily
                </SelectItem>
                <SelectItem value="weekly" className="text-white hover:bg-[#374151]">
                  Weekly
                </SelectItem>
                <SelectItem value="monthly" className="text-white hover:bg-[#374151]">
                  Monthly
                </SelectItem>
                <SelectItem value="threshold" className="text-white hover:bg-[#374151]">
                  When threshold reached
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Threshold Amount (if threshold selected) */}
          {schedule.frequency === "threshold" && (
            <div className="space-y-2">
              <Label className="text-[#9ca3af]">Threshold Amount ($)</Label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={!schedule.enabled}
                className="bg-[#1f2937] border-[#374151] text-white"
              />
            </div>
          )}

          {/* Default Wallet */}
          <div className="space-y-2">
            <Label className="text-[#9ca3af]">Payout Wallet</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1f2937] border border-[#374151]">
              <Wallet className="h-4 w-4 text-[#22d3ee]" />
              <code className="text-sm text-[#9ca3af] flex-1">{defaultWallet}</code>
              <Badge className="bg-[#22d3ee]/20 text-[#22d3ee] border-0 text-xs">Default</Badge>
            </div>
          </div>
        </div>

        {/* Next Payout Info */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">Next Scheduled Payout</p>
              <p className="text-lg font-semibold text-white">{getNextPayoutDate()}</p>
            </div>
          </div>
          {schedule.enabled && (
            <Badge className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>

        {/* Recent Payouts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#9ca3af]">Recent Payouts</h4>
          <div className="space-y-2">
            {[
              { date: "Jan 1, 2025", amount: 150, status: "completed" },
              { date: "Dec 25, 2024", amount: 200, status: "completed" },
              { date: "Dec 18, 2024", amount: 175, status: "completed" },
            ].map((payout, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1f2937] border border-[#374151]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">${payout.amount.toFixed(2)}</p>
                    <p className="text-xs text-[#6b7280]">{payout.date}</p>
                  </div>
                </div>
                <Badge className="bg-[#10b981]/20 text-[#10b981] border-0 text-xs">Completed</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Payout Button */}
        <Button
          onClick={handleManualPayout}
          disabled={!canPayout || isProcessing}
          className="w-full h-12 bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#0891b2] text-[#111827] font-semibold disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Request Manual Payout
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
