"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Wallet, Settings, Loader2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"


export default function AdminSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Settings
  const [topupAddress, setTopupAddress] = useState("")

  useEffect(() => {
    const checkAuth = () => {
      const isAdmin = localStorage.getItem("adminAuthenticated")
      if (!isAdmin) {
        router.push("/admin/login")
        return
      }
      fetchSettings()
    }
    checkAuth()
  }, [router])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (data.success && data.settings?.topup_address) {
        setTopupAddress(data.settings.topup_address)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topup_address: topupAddress }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSaved(true)
      toast({ title: "Settings Saved", description: "Your settings have been updated successfully" })
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
              <p className="text-sm text-slate-500">Configure platform settings</p>
            </div>
          </div>
          
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="h-10 px-6 font-semibold text-white transition-all"
            style={{
              background: saved 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #7c3aed, #6366f1)',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Wallet Settings Card */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Wallet & Payment Settings</CardTitle>
                  <CardDescription>Configure crypto addresses for user deposits</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Topup Address */}
                <div className="space-y-2">
                  <Label htmlFor="topupAddress" className="text-sm font-semibold text-slate-700">
                    Topup Crypto Address (BEP20)
                  </Label>
                  <Input
                    id="topupAddress"
                    value={topupAddress}
                    onChange={(e) => setTopupAddress(e.target.value)}
                    placeholder="Enter BEP20 wallet address for user deposits"
                    className="h-12 text-base font-mono border-2 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                  <p className="text-xs text-slate-500">
                    This address will be displayed to users when they want to top up their wallet balance.
                  </p>
                </div>

                {/* Preview */}
                {topupAddress && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Preview:</p>
                    <div className="p-3 rounded-lg bg-white border border-dashed border-purple-200">
                      <p className="text-sm font-mono text-slate-700 break-all">{topupAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* General Settings Card */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700"
                  style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
                >
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">General Settings</CardTitle>
                  <CardDescription>Platform configuration options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-slate-500 text-sm">More settings coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
