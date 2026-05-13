"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Gift, MessageCircle, Copy, Mail, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

export default function ReferPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)
  const [referralLink, setReferralLink] = useState("")
  const [showCopyAlert, setShowCopyAlert] = useState(false)

  const isAuthenticated = isParticipantAuthenticated()
  const REWARD_PER_REFERRAL = 5 // $5 per referral when they add funds or complete contribution

  useEffect(() => {
    setMounted(true)
    
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }

    const fetchData = async () => {
      try {
        const storedData = localStorage.getItem("participantData")
        if (!storedData) {
          router.push("/participant/login")
          return
        }

        const parsedData = JSON.parse(storedData)
        setParticipantData(parsedData)

        // Build referral link using flowchain.club
        const link = `https://flowchain.club/register?ref=${parsedData.referral_code}`
        setReferralLink(link)

        // Fetch participant record to get earnings
        const meRes = await fetch(`/api/participant/me?email=${encodeURIComponent(parsedData.email)}`)
        const meJson = await meRes.json()
        const participantRecord: any = meJson.participant

        if (participantRecord) {
          setTotalEarnings(Number(participantRecord.referral_earnings) || 0)
          setPendingEarnings(Number(participantRecord.referral_earnings) || 0)
        }
      } catch (err) {
        console.error("[v0] Error in fetchData:", err)
      }
    }

    fetchData()
  }, [router, isAuthenticated])

  const claimReward = async (email: string) => {
    try {
      const response = await fetch("/api/participant/claim-referral-reward", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Participant-Token": email
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success! 🎉",
          description: `$${result.amount} USDT referral earnings claimed to your wallet!`,
          duration: 5000,
        })
        setTotalEarnings(result.newBalance)
        setPendingEarnings(0)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to claim reward",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error claiming reward:", error)
      toast({
        title: "Error",
        description: "Failed to claim reward",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 2000)
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
      duration: 2000,
    })
  }

  const shareVia = (platform: string) => {
    const message = `🎯 Join FlowChain and start earning! I'm earning $5 for every friend who joins using my link. Get rewarded when they add funds or complete tasks: ${referralLink}`
    const encodedMsg = encodeURIComponent(message)
    const encodedLink = encodeURIComponent(referralLink)
    let shareUrl = ""

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedMsg}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMsg}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedMsg}`
        break
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodedLink}&text=${encodedMsg}`
        break
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`
        break
      case "email":
        shareUrl = `mailto:?subject=Join FlowChain - Earn $5 Per Referral&body=${encodedMsg}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank")
    }
  }

  if (!mounted || !participantData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-orange-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link href="/participant/dashboard">
            <Button variant="ghost" size="icon" className="h-10 w-10 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Earn $5 Per Referral</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Hero Card */}
        <Card 
          className="border-0 shadow-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 50%, #E85D3B 100%)",
          }}
        >
          <CardContent className="p-6 relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Earn $5 Per Referral
                  </h2>
                  <p className="text-white/90 text-sm">
                    Get $5 USDT every time a friend adds funds or completes a contribution. No limits!
                  </p>
                </div>
                <Heart className="h-12 w-12 text-white/90" />
              </div>

              {/* Earnings Display */}
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 mt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-white/80 font-semibold text-xs block mb-1">Total Earnings</span>
                  <span className="text-white font-bold text-2xl">
                    ${totalEarnings.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-white/80 font-semibold text-xs block mb-1">Pending</span>
                  <span className="text-white font-bold text-2xl">
                    ${pendingEarnings.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Claim Button */}
              {pendingEarnings > 0 && (
                <Button
                  onClick={() => claimReward(participantData?.email)}
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Claim ${pendingEarnings.toFixed(2)} Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Share Referral Link */}
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-900 mb-4">Share Your Referral Link</h3>
            
            {/* Referral Link Display */}
            <div className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-300 mb-4">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-purple-600 flex-1 break-all">
                  {referralLink}
                </code>
                <Button
                  onClick={() => copyToClipboard(referralLink)}
                  size="sm"
                  className="flex-shrink-0 bg-purple-600 hover:bg-purple-700"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {showCopyAlert && (
                <p className="text-xs text-emerald-600 mt-2">✓ Copied to clipboard!</p>
              )}
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600 font-semibold mb-3">Share on social media:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => shareVia("whatsapp")}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  onClick={() => shareVia("twitter")}
                  className="w-full bg-blue-400 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  X
                </Button>
                <Button
                  onClick={() => shareVia("facebook")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  FB
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => shareVia("telegram")}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold"
                >
                  Telegram
                </Button>
                <Button
                  onClick={() => shareVia("email")}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button
                  onClick={() => shareVia("linkedin")}
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  LinkedIn
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">How to Earn $5 Per Referral</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Share Your Link</p>
                  <p className="text-xs text-slate-600">
                    Copy your unique referral link (flowchain.club) and share it with friends
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Friends Register</p>
                  <p className="text-xs text-slate-600">
                    They sign up and join FlowChain using your referral link
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">They Add Funds or Contribute</p>
                  <p className="text-xs text-slate-600">
                    When they add funds to wallet or complete contribution cycle
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                  💰
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">You Earn $5 USDT</p>
                  <p className="text-xs text-slate-600">
                    $5 USDT is instantly credited to your referral earnings
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Claim Anytime</p>
                  <p className="text-xs text-slate-600">
                    Claim your earnings and transfer to your wallet balance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Referral Code Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-900 mb-2 text-sm">Referral Code</h3>
            <div className="bg-white rounded-lg p-3 border-2 border-emerald-300">
              <code className="text-lg font-bold text-emerald-600 tracking-wider">
                {participantData?.referral_code}
              </code>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Your unique code for referral tracking (also included in link: flowchain.club)
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
