"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Download } from "lucide-react"

interface Stake {
  id: number
  participant_id: string
  participant_email: string
  full_name: string
  coin_symbol: string
  amount: number
  apy: number
  daily_reward: number
  total_earned: number
  status: string
  start_date: string
  end_date: string
  created_at: string
}

interface Reward {
  id: number
  stake_id: number
  participant_email: string
  reward_amount: number
  accrued_date: string
  claimed: boolean
}

interface Claim {
  id: number
  stake_id: number
  participant_email: string
  amount_claimed: number
  claim_type: string
  status: string
  claim_date: string
}

export function StakingAdminPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stakes, setStakes] = useState<Stake[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [stats, setStats] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("stakes")

  useEffect(() => {
    fetchStakingData()
  }, [])

  const fetchStakingData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/all-stakes")
      if (response.ok) {
        const { data } = await response.json()
        setStakes(data.stakes)
        setRewards(data.rewards)
        setClaims(data.claims)
        setStats(data.stats)
        toast({ title: "Success", description: "Staking data loaded" })
      }
    } catch (error) {
      console.error("Error fetching staking data:", error)
      toast({ title: "Error", description: "Failed to load staking data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((item) => Object.values(item).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  const filteredStakes = stakes.filter(
    (s) =>
      s.participant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.coin_symbol?.includes(searchTerm.toUpperCase())
  )

  const filteredRewards = rewards.filter((r) =>
    r.participant_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClaims = claims.filter((c) =>
    c.participant_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Staking Management</h2>
          <p className="text-slate-400 text-sm">View and manage all staking records</p>
        </div>
        <Button onClick={fetchStakingData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Stakes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total_stakes}</div>
              <p className="text-xs text-slate-500 mt-1">Active: {stats.active_stakes}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Staked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${stats.total_staked.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Across all coins</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">${stats.total_earned.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">All rewards claimed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.total_claims.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Rewards claimed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div>
        <Input
          placeholder="Search by email, name, or coin symbol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900/50 border-slate-700">
          <TabsTrigger value="stakes">Active Stakes ({filteredStakes.length})</TabsTrigger>
          <TabsTrigger value="rewards">Rewards ({filteredRewards.length})</TabsTrigger>
          <TabsTrigger value="claims">Claims ({filteredClaims.length})</TabsTrigger>
        </TabsList>

        {/* Stakes Tab */}
        <TabsContent value="stakes" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => handleExportCSV(filteredStakes, "stakes.csv")}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Coin</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Amount</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">APY</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Daily Reward</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Total Earned</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">End Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredStakes.map((stake) => (
                  <tr key={stake.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-white text-xs">{stake.participant_email}</td>
                    <td className="py-3 px-4 text-white">{stake.full_name || "-"}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-mono">
                        {stake.coin_symbol}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono">
                      ${stake.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-400 font-mono">{stake.apy}%</td>
                    <td className="py-3 px-4 text-right text-blue-400 font-mono">
                      ${stake.daily_reward.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-400 font-mono">
                      ${stake.total_earned.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={stake.status === "active" ? "default" : "secondary"}>
                        {stake.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(stake.end_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStakes.length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-8 text-center text-slate-400">
                No stakes found matching your search
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => handleExportCSV(filteredRewards, "rewards.csv")}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Reward Amount</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Accrued Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Claimed</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Claimed At</th>
                </tr>
              </thead>
              <tbody>
                {filteredRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-white text-xs">{reward.participant_email}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-mono">
                      ${reward.reward_amount.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(reward.accrued_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={reward.claimed ? "default" : "secondary"}>
                        {reward.claimed ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {reward.claimed_at ? new Date(reward.claimed_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRewards.length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-8 text-center text-slate-400">
                No rewards found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => handleExportCSV(filteredClaims, "claims.csv")}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Amount Claimed</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Claim Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-white text-xs">{claim.participant_email}</td>
                    <td className="py-3 px-4 text-right text-purple-400 font-mono">
                      ${claim.amount_claimed.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{claim.claim_type}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{claim.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(claim.claim_date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClaims.length === 0 && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-8 text-center text-slate-400">
                No claims found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
