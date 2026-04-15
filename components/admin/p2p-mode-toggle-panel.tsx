"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Power, Users, Wallet, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface P2PSettings {
  p2p_mode_enabled: boolean
  admin_wallet_address: string
  last_updated: string
}

export function P2PModeTogglePanel() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<P2PSettings>({
    p2p_mode_enabled: true,
    admin_wallet_address: "",
    last_updated: "",
  })
  const [adminWallet, setAdminWallet] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const supabase = createClient()

      // Fetch P2P mode setting
      const { data: p2pModeSetting, error: p2pError } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", "p2p_mode_enabled")
        .maybeSingle()

      // Fetch admin wallet setting
      const { data: walletSetting, error: walletError } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", "admin_wallet_address")
        .maybeSingle()

      if (p2pError && p2pError.code !== "PGRST116") throw p2pError
      if (walletError && walletError.code !== "PGRST116") throw walletError

      setSettings({
        p2p_mode_enabled: p2pModeSetting?.setting_value === "true" || true,
        admin_wallet_address: walletSetting?.setting_value || "",
        last_updated: p2pModeSetting?.updated_at || new Date().toISOString(),
      })

      setAdminWallet(walletSetting?.setting_value || "")
    } catch (error) {
      console.error("[v0] Error fetching P2P settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleP2PMode = async (enabled: boolean) => {
    setIsUpdating(true)

    try {
      const supabase = createClient()

      // Upsert P2P mode setting
      const { error } = await supabase.from("system_settings").upsert({
        setting_key: "p2p_mode_enabled",
        setting_value: enabled.toString(),
        setting_type: "boolean",
        description: "Enable or disable P2P contribution routing",
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setSettings((prev) => ({
        ...prev,
        p2p_mode_enabled: enabled,
        last_updated: new Date().toISOString(),
      }))

      toast({
        title: enabled ? "P2P Mode Enabled" : "P2P Mode Disabled",
        description: enabled
          ? "Contributions will be matched to pending payouts"
          : "All contributions will go directly to admin wallet",
      })
    } catch (error) {
      console.error("[v0] Error toggling P2P mode:", error)
      toast({
        title: "Error",
        description: "Failed to update P2P mode",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateAdminWallet = async () => {
    if (!adminWallet.trim()) {
      toast({
        title: "Missing Wallet",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("system_settings").upsert({
        setting_key: "admin_wallet_address",
        setting_value: adminWallet.trim(),
        setting_type: "string",
        description: "Admin wallet address for direct contributions when P2P is OFF",
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setSettings((prev) => ({
        ...prev,
        admin_wallet_address: adminWallet.trim(),
      }))

      toast({
        title: "Wallet Updated",
        description: "Admin wallet address has been saved",
      })
    } catch (error) {
      console.error("[v0] Error updating admin wallet:", error)
      toast({
        title: "Error",
        description: "Failed to update admin wallet",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-12 text-center">
          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-slate-400">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* P2P Mode Toggle */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Power className="h-5 w-5 text-purple-400" />
                P2P Mode Control
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Toggle peer-to-peer contribution routing on or off
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {settings.p2p_mode_enabled ? "ON" : "OFF"}
              </span>
              <Switch
                checked={settings.p2p_mode_enabled}
                onCheckedChange={toggleP2PMode}
                disabled={isUpdating}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mode Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.p2p_mode_enabled
                    ? "bg-green-500/10 border-green-500/50"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-green-400" />
                  <h4 className="text-sm font-semibold text-white">P2P Mode ON</h4>
                </div>
                <p className="text-xs text-slate-400">
                  New contributors are automatically matched to users with pending payouts. Their $100
                  contribution goes directly to the matched user's wallet address.
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  !settings.p2p_mode_enabled
                    ? "bg-red-500/10 border-red-500/50"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-red-400" />
                  <h4 className="text-sm font-semibold text-white">P2P Mode OFF</h4>
                </div>
                <p className="text-xs text-slate-400">
                  All new contributions go directly to the admin wallet. No automatic matching occurs. Use
                  this for maintenance or emergency situations.
                </p>
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Important</h4>
                  <p className="text-xs text-slate-400">
                    When P2P mode is OFF, make sure the admin wallet address is correctly configured below.
                    All contributions will be sent to this address until P2P mode is re-enabled.
                  </p>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-slate-500 text-center">
              Last updated: {new Date(settings.last_updated).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Wallet Configuration */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-400" />
            Admin Wallet Address
          </CardTitle>
          <CardDescription className="text-slate-400">
            Wallet address used when P2P mode is OFF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-400 mb-2 block">BEP20 Wallet Address</Label>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter admin wallet address (BEP20)..."
                  value={adminWallet}
                  onChange={(e) => setAdminWallet(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white flex-1"
                />
                <Button
                  onClick={updateAdminWallet}
                  disabled={isUpdating || !adminWallet.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUpdating ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {settings.admin_wallet_address && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Current Admin Wallet:</p>
                <p className="text-sm text-white font-mono break-all">{settings.admin_wallet_address}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
