"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Percent,
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  Zap,
  Crown,
  Gift,
  Info,
} from "lucide-react"

interface FeeTier {
  name: string
  minParticipations: number
  feePercent: number
  color: string
  icon: typeof Shield
}

interface FeeConfigurationProps {
  onSave?: (config: any) => void
}

export function FeeConfiguration({ onSave }: FeeConfigurationProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dynamicFeesEnabled, setDynamicFeesEnabled] = useState(true)

  const [feeTiers, setFeeTiers] = useState<FeeTier[]>([
    { name: "Standard", minParticipations: 0, feePercent: 5, color: "#6b7280", icon: Shield },
    { name: "Silver", minParticipations: 10, feePercent: 4, color: "#c0c0c0", icon: Zap },
    { name: "Gold", minParticipations: 25, feePercent: 3, color: "#ffd700", icon: Crown },
    { name: "Platinum", minParticipations: 50, feePercent: 2, color: "#22d3ee", icon: Gift },
  ])

  const [globalSettings, setGlobalSettings] = useState({
    minFee: 1,
    maxFee: 10,
    withdrawalFee: 1,
    instantWithdrawalFee: 3,
  })

  const stats = {
    totalFeesCollected: 12450.75,
    avgFeePercent: 3.8,
    usersOnReducedFees: 234,
    feeSavingsDistributed: 2340.5,
  }

  const handleTierFeeChange = (tierName: string, newFee: number) => {
    setFeeTiers((prev) => prev.map((tier) => (tier.name === tierName ? { ...tier, feePercent: newFee } : tier)))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    onSave?.({ feeTiers, globalSettings, dynamicFeesEnabled })
    setIsSaving(false)
    setShowSaveDialog(false)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af]">Total Fees Collected</p>
                  <p className="text-2xl font-bold text-[#10b981]">${stats.totalFeesCollected.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#10b981]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af]">Avg Fee Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.avgFeePercent}%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-[#7c3aed]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af]">Reduced Fee Users</p>
                  <p className="text-2xl font-bold text-[#22d3ee]">{stats.usersOnReducedFees}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#22d3ee]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af]">Savings Given</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">${stats.feeSavingsDistributed.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#f59e0b]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Fees Toggle */}
        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#22d3ee]" />
                <CardTitle className="text-white">Dynamic Fee Structure</CardTitle>
              </div>
              <Switch checked={dynamicFeesEnabled} onCheckedChange={setDynamicFeesEnabled} />
            </div>
            <CardDescription className="text-[#9ca3af]">
              Automatically adjust fees based on user participation level
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Fee Tiers */}
        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Percent className="h-5 w-5 text-[#22d3ee]" />
              Fee Tiers
            </CardTitle>
            <CardDescription className="text-[#9ca3af]">Configure fee rates for each membership tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeTiers.map((tier) => {
              const TierIcon = tier.icon
              return (
                <div
                  key={tier.name}
                  className="p-4 rounded-xl bg-[#111827] border border-[#374151] hover:border-[#7c3aed]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tier.color}30` }}
                    >
                      <TierIcon className="h-6 w-6" style={{ color: tier.color }} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{tier.name}</h4>
                        <Badge className="bg-[#374151] text-[#9ca3af] border-0 text-xs">
                          {tier.minParticipations}+ participations
                        </Badge>
                      </div>
                      <Slider
                        value={[tier.feePercent]}
                        onValueChange={([value]) => handleTierFeeChange(tier.name, value)}
                        min={globalSettings.minFee}
                        max={globalSettings.maxFee}
                        step={0.5}
                        disabled={!dynamicFeesEnabled && tier.name !== "Standard"}
                        className="w-64"
                      />
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold" style={{ color: tier.color }}>
                        {tier.feePercent}%
                      </p>
                      <p className="text-xs text-[#6b7280]">fee rate</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Global Settings */}
        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#22d3ee]" />
              Global Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#9ca3af]">Minimum Fee (%)</Label>
                <Input
                  type="number"
                  value={globalSettings.minFee}
                  onChange={(e) => setGlobalSettings((prev) => ({ ...prev, minFee: Number(e.target.value) }))}
                  className="bg-[#111827] border-[#374151] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#9ca3af]">Maximum Fee (%)</Label>
                <Input
                  type="number"
                  value={globalSettings.maxFee}
                  onChange={(e) => setGlobalSettings((prev) => ({ ...prev, maxFee: Number(e.target.value) }))}
                  className="bg-[#111827] border-[#374151] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#9ca3af]">Standard Withdrawal Fee (%)</Label>
                <Input
                  type="number"
                  value={globalSettings.withdrawalFee}
                  onChange={(e) => setGlobalSettings((prev) => ({ ...prev, withdrawalFee: Number(e.target.value) }))}
                  className="bg-[#111827] border-[#374151] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#9ca3af]">Instant Withdrawal Fee (%)</Label>
                <Input
                  type="number"
                  value={globalSettings.instantWithdrawalFee}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, instantWithdrawalFee: Number(e.target.value) }))
                  }
                  className="bg-[#111827] border-[#374151] text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#22d3ee]/10 border border-[#22d3ee]/30">
          <Info className="h-5 w-5 text-[#22d3ee]" />
          <p className="text-sm text-[#9ca3af]">
            Changes to fee structure will apply to new transactions only. Existing pending payouts will use the previous
            rates.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowSaveDialog(true)}
            className="bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#0891b2] text-[#111827] font-semibold px-8"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-[#1e1b4b] border-[#374151] text-white">
          <DialogHeader>
            <DialogTitle>Save Fee Configuration</DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Are you sure you want to save these changes?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#374151]">
              <h4 className="text-sm font-medium text-white mb-3">Updated Fee Tiers</h4>
              <div className="space-y-2">
                {feeTiers.map((tier) => (
                  <div key={tier.name} className="flex justify-between text-sm">
                    <span className="text-[#9ca3af]">{tier.name}</span>
                    <span style={{ color: tier.color }}>{tier.feePercent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
              <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-sm text-[#f59e0b]">Changes will affect all new transactions</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              className="border-[#374151] text-[#9ca3af]"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#10b981] hover:bg-[#059669] text-white">
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
