"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Mail, Phone, Wallet, DollarSign, Timer, CheckCircle2, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const CONTRIBUTION_WINDOW_HOURS = 24

export default function ContributionViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const participantEmail = searchParams.get('email')
  const payoutId = searchParams.get('payoutId')
  const payoutSerial = searchParams.get('payoutSerial')
  const payoutName = searchParams.get('payoutName')
  const payoutAmount = searchParams.get('payoutAmount')
  
  const [contributionData, setContributionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    if (participantEmail) {
      fetchContributionDetails()
    }
    
    // Hide animation after 2 seconds
    setTimeout(() => setShowAnimation(false), 2000)
  }, [participantEmail])

  useEffect(() => {
    if (contributionData) {
      calculateTimeRemaining()
      const timer = setInterval(calculateTimeRemaining, 1000)
      return () => clearInterval(timer)
    }
  }, [contributionData])

  const fetchContributionDetails = async () => {
    try {
      const supabase = createClient()

      // Fetch approved contribution or matched payout
      const { data: approvedData } = await supabase
        .from("payment_submissions")
        .select("id, amount, status, created_at, participant_email, participant_id")
        .eq("participant_email", participantEmail)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)

      // Check payout request
      const { data: payoutData } = await supabase
        .from("payout_requests")
        .select("id, amount, participant_email, participant_id, status, created_at")
        .eq("participant_email", participantEmail)
        .in("status", ["pending", "processing", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)

      const targetParticipantId = approvedData?.[0]?.participant_id || payoutData?.[0]?.participant_id

      if (targetParticipantId) {
        // Fetch participant details
        const { data: participantDetails } = await supabase
          .from("participants")
          .select("id, full_name, mobile_number, wallet_address, email")
          .eq("id", targetParticipantId)
          .single()

        // Fetch wallet pool
        const { data: walletPoolData } = await supabase
          .from("wallet_pool")
          .select("wallet_address")
          .eq("assigned_to", targetParticipantId)
          .limit(1)
          .single()

        if (participantDetails) {
          setContributionData({
            id: approvedData?.[0]?.id || payoutData?.[0]?.id,
            amount: approvedData?.[0]?.amount || payoutData?.[0]?.amount || 100,
            status: approvedData?.[0] ? "approved" : "matched_payout",
            created_at: approvedData?.[0]?.created_at || payoutData?.[0]?.created_at,
            participants: participantDetails,
            wallet_pool: walletPoolData || { wallet_address: null }
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching contribution details:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTimeRemaining = () => {
    if (!contributionData) return

    const approvedTime = new Date(contributionData.created_at).getTime()
    const expiryTime = approvedTime + (CONTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000)
    const now = Date.now()
    const remaining = expiryTime - now

    if (remaining <= 0) {
      setTimeRemaining("Expired")
      return
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading contribution details...</p>
        </div>
      </div>
    )
  }

  if (!contributionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600 mb-4">No contribution details found for this participant.</p>
            <Link href="/admin/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 relative overflow-hidden">
      {/* Success Animation Overlay */}
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mb-4 animate-pulse">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Payout Matched!</h2>
              <p className="text-slate-600 text-center">Redirecting to contribution details...</p>
              <div className="flex gap-1 mt-4">
                <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Contribution Details</h1>
            <p className="text-xs text-slate-500">Matched payout contribution view</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in slide-in-from-bottom duration-700">
        {/* Payout Creator Info - Only show if coming from payout approval */}
        {payoutId && (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 animate-in slide-in-from-top duration-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Payout Request Matched
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Payout Serial</p>
                  <p className="text-sm font-bold text-blue-900">{payoutSerial || 'N/A'}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Requestor</p>
                  <p className="text-sm font-bold text-blue-900">{payoutName || 'N/A'}</p>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Payout Amount</p>
                <p className="text-2xl font-black text-blue-600">${payoutAmount || '0.00'}</p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg border border-green-300">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">This payout has been matched with the contribution below</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Banner */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 animate-in slide-in-from-top duration-500" style={{ animationDelay: payoutId ? '0.1s' : '0s' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-900">Contribution Approved!</h2>
                <p className="text-sm text-green-700">Participant has 24 hours to complete the contribution</p>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl border-2 border-green-300">
              <Timer className="h-6 w-6 text-green-600" />
              <div className="text-center">
                <p className="text-xs text-slate-600 font-medium mb-1">Time Remaining</p>
                <p className="text-2xl font-black text-green-600">{timeRemaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participant Details */}
        <Card className="animate-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="text-lg">Participant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <User className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-sm font-semibold text-slate-900">
                  {contributionData.participants?.full_name || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-semibold text-slate-900">
                  {contributionData.participants?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Phone className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-xs text-slate-500">Contact Number</p>
                <p className="text-sm font-semibold text-slate-900">
                  {contributionData.participants?.mobile_number || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Wallet className="h-5 w-5 text-slate-600" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Participant BEP20 Wallet</p>
                <p className="text-xs font-mono text-slate-900 break-all">
                  {contributionData.participants?.wallet_address || "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contribution Amount */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-700 font-medium">Contribution Amount</p>
                  <p className="text-3xl font-black text-purple-900">${contributionData.amount}</p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white">USDT (BEP20)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Collection Wallet */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="text-base">Collection Wallet Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
              <p className="text-xs text-slate-600 mb-2">BEP20 Wallet</p>
              <p className="text-sm font-mono font-bold text-blue-900 break-all">
                {contributionData.wallet_pool?.wallet_address || "No wallet assigned yet"}
              </p>
            </div>
            <p className="text-xs text-slate-600 mt-3 text-center">
              Participant should send ${contributionData.amount} USDT to this address
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
