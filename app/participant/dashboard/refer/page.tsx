"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Gift, MessageCircle, Check, X, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"


interface Contact {
  name: string
  phone: string
}

export default function ReferPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [joinedCount, setJoinedCount] = useState(0)
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [isSending, setIsSending] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)

  const isAuthenticated = isParticipantAuthenticated()
  const REFERRAL_TARGET = 4
  const REWARD_AMOUNT = 20

  useEffect(() => {
    console.log("[v0] Refer page mounting...")
    setMounted(true)
    
    if (!isAuthenticated) {
      console.log("[v0] Not authenticated, redirecting")
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
        console.log("[v0] Participant data loaded:", parsedData.email)

        // Fetch participant data + invite count from API
        const res = await fetch(`/api/participant/me?email=${encodeURIComponent(parsedData.email)}`)
        const json = await res.json()

        if (!json.success) {
          console.error("[v0] Error fetching participant:", json.error)
          return
        }

        const participantRecord = json.participant
        console.log("[v0] Participant ID:", participantRecord.id)

        // Fetch invite count
        const inviteRes = await fetch(`/api/participant/invite-log?participantId=${encodeURIComponent(participantRecord.id)}`)
        const inviteData = await inviteRes.json()

        const count = inviteData.count || 0
        console.log("[v0] Joined invites count:", count)
        setJoinedCount(count)

        // Auto-claim reward if eligible and not yet claimed
        if (count >= REFERRAL_TARGET && !participantRecord.referral_reward_claimed) {
          console.log("[v0] Auto-claiming $20 reward...")
          await claimReward(parsedData.email, participantRecord.id)
        }
      } catch (err) {
        console.error("[v0] Error in fetchData:", err)
      }
    }

    fetchData()
  }, [router, isAuthenticated])

  const claimReward = async (email: string, userId: string) => {
    try {
      console.log("[v0] Attempting to claim reward for", email)
      
      const response = await fetch("/api/participant/claim-referral-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      })

      const result = await response.json()
      
      if (result.success) {
        setRewardClaimed(true)
        toast({
          title: "Congratulations! 🎉",
          description: `$${REWARD_AMOUNT} USDT has been credited to your wallet!`,
          duration: 5000,
        })
        
        // Update local data
        if (participantData) {
          const updated = { ...participantData, referral_reward_claimed: true }
          setParticipantData(updated)
          localStorage.setItem("participantData", JSON.stringify(updated))
        }
      }
    } catch (error) {
      console.error("[v0] Error claiming reward:", error)
    }
  }

  const handleContactPicker = async () => {
    try {
      // Check if Contact Picker API is available
      if (!("contacts" in navigator)) {
        toast({
          title: "Not Supported",
          description: "Contact picker is not available on this device",
          variant: "destructive",
        })
        return
      }

      const props = ["name", "tel"]
      const contacts = await (navigator as any).contacts.select(props, { multiple: true })
      
      console.log("[v0] Contacts selected:", contacts.length)
      
      const formattedContacts: Contact[] = contacts
        .filter((c: any) => c.tel && c.tel.length > 0)
        .map((contact: any) => ({
          name: contact.name?.[0] || "Unknown",
          phone: contact.tel[0].replace(/\D/g, ""), // Remove non-digits
        }))

      setSelectedContacts(formattedContacts)
      toast({
        title: "Contacts Selected",
        description: `${formattedContacts.length} contacts selected`,
      })
    } catch (error) {
      console.error("[v0] Contact picker error:", error)
      toast({
        title: "Selection Cancelled",
        description: "No contacts were selected",
        variant: "destructive",
      })
    }
  }

  const handleSendInvites = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "Please select contacts first",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      // Get participant ID from API
      const meRes = await fetch(`/api/participant/me?email=${encodeURIComponent(participantData?.email || "")}`)
      const meJson = await meRes.json()

      if (!meJson.success) {
        console.error("[v0] Error fetching participant ID:", meJson.error)
        toast({
          title: "Error",
          description: "Failed to get participant ID",
          variant: "destructive",
        })
        setIsSending(false)
        return
      }
      const participantRecord = meJson.participant

      // Hash phone numbers using SHA-256
      const contactHashes = await Promise.all(
        selectedContacts.map(async (c) => {
          // Use Web Crypto API for SHA-256 hashing
          const encoder = new TextEncoder()
          const data = encoder.encode(c.phone)
          const hashBuffer = await crypto.subtle.digest("SHA-256", data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
          
          return { contactHash: hashHex, contactName: c.name, contactPhone: c.phone }
        })
      )

      console.log("[v0] Logging", contactHashes.length, "invites for user ID:", participantRecord.id)

      // Send to API to log invites
      const response = await fetch("/api/participant/invite-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: participantRecord.id,
          contacts: contactHashes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Invites Logged!",
          description: "Opening WhatsApp for each contact...",
        })

        // Open WhatsApp for each contact
        const referralLink = `${window.location.origin}/participant/register?ref=${participantData?.referral_code}`
        const message = `Hey! I joined FlowChain 🚀 Join using my link and earn rewards: ${referralLink}`

        selectedContacts.forEach((contact, index) => {
          setTimeout(() => {
            const whatsappUrl = `https://wa.me/${contact.phone}?text=${encodeURIComponent(message)}`
            window.open(whatsappUrl, "_blank")
          }, index * 1000) // Stagger by 1 second
        })

        // Clear selection after sending
        setTimeout(() => {
          setSelectedContacts([])
        }, selectedContacts.length * 1000 + 500)
      } else {
        throw new Error(result.error || "Failed to log invites")
      }
    } catch (error) {
      console.error("[v0] Error sending invites:", error)
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (!mounted || !participantData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  const progressPercentage = Math.min((joinedCount / REFERRAL_TARGET) * 100, 100)
  const isRewardEligible = joinedCount >= REFERRAL_TARGET

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
          <h1 className="text-lg font-semibold text-slate-900">Invite 4 Friends, Get $20</h1>
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
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Invite 4 Friends, Get $20
                  </h2>
                  <p className="text-white/90 text-sm">
                    Share your referral link on WhatsApp. When 4 friends successfully register, you get $20 USDT instantly.
                  </p>
                </div>
                <Gift className="h-12 w-12 text-white/90" />
              </div>

              {/* Progress Section */}
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-sm">Progress</span>
                  <span className="text-white font-bold text-lg">
                    {joinedCount} / {REFERRAL_TARGET}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-white/30" />
                <p className="text-white/80 text-xs mt-2">
                  {isRewardEligible ? "🎉 You've earned $20!" : `${REFERRAL_TARGET - joinedCount} more invites for $20`}
                </p>
              </div>

              {/* Reward Badge */}
              {isRewardEligible && (
                <div className="mt-4 bg-emerald-500 rounded-xl p-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-white" />
                  <span className="text-white font-semibold">
                    {rewardClaimed ? "$20 Claimed!" : "$20 Ready to Claim!"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite Button */}
        <Button
          onClick={handleContactPicker}
          className="w-full h-14 text-base font-semibold shadow-lg"
          style={{
            background: "linear-gradient(135deg, #10b981, #34d399)",
            boxShadow: "0 6px 0 #047857",
          }}
        >
          <Users className="h-5 w-5 mr-2" />
          Invite Friends & Earn $20
        </Button>

        {/* Selected Contacts */}
        {selectedContacts.length > 0 && (
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">
                  Selected Contacts ({selectedContacts.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContacts([])}
                  className="h-8 bg-transparent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.phone}</p>
                    </div>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSendInvites}
                disabled={isSending}
                className="w-full mt-4 h-12 bg-transparent"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #c084fc)",
                  boxShadow: "0 4px 0 #6d28d9",
                }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Send WhatsApp Invites
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* How it Works */}
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Select Contacts</p>
                  <p className="text-xs text-slate-600">
                    Use the contact picker to select friends you want to invite
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Send Invites</p>
                  <p className="text-xs text-slate-600">
                    WhatsApp will open for each contact - send them your referral link
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Track Progress</p>
                  <p className="text-xs text-slate-600">
                    When friends register using your link, your progress updates automatically
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Earn Reward</p>
                  <p className="text-xs text-slate-600">
                    After 4 friends register, get $20 USDT instantly in your wallet
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Referral Code */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-900 mb-2 text-sm">Your Referral Code</h3>
            <div className="bg-white rounded-lg p-3 border-2 border-dashed border-slate-300">
              <code className="text-lg font-bold text-purple-600 tracking-wider">
                {participantData.referral_code}
              </code>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Share this code with friends or use the invite button above
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
