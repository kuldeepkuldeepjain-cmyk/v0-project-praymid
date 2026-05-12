"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Gift, MessageCircle, Check, X, Loader2, Sparkles, Copy, Share2, ExternalLink } from "lucide-react"
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
  const [copied, setCopied] = useState(false)

  const REFERRAL_TARGET = 4
  const REWARD_AMOUNT = 20

  useEffect(() => {

    setMounted(true)
    
    if (!isParticipantAuthenticated()) {
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
        

        // Fetch participant record via API
        const meRes = await fetch(`/api/participant/me?email=${encodeURIComponent(parsedData.email)}`)
        const meJson = await meRes.json()
        const participantRecord: any = meJson.participant

        if (!participantRecord) {
          
          return
        }

        // Fetch invite logs
        const inviteRes = await fetch(`/api/participant/invite-log?email=${encodeURIComponent(parsedData.email)}`)
        const inviteJson = await inviteRes.json()
        const count: number = inviteJson.count || 0
        setJoinedCount(count)

        // Auto-claim reward if eligible and not yet claimed
        if (count >= REFERRAL_TARGET && !participantRecord.referral_reward_claimed) {
          await claimReward(parsedData.email, participantRecord.id)
        }
      } catch (err) {
        
      }
    }

    fetchData()
  }, [router])

  const claimReward = async (email: string, userId: string) => {
    try {
      
      
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
      
    }
  }

  const getReferralLink = () => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/participant/register?ref=${participantData?.referral_code || ""}`
  }

  const getReferralMessage = () => {
    return `Hey! Join FlowChain and start earning rewards! Use my referral link to sign up and we both get bonuses: ${getReferralLink()}`
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink())
      setCopied(true)
      toast({
        title: "Link Copied!",
        description: "Referral link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const shareToWhatsApp = () => {
    const message = getReferralMessage()
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  const shareToTelegram = () => {
    const message = getReferralMessage()
    const url = `https://t.me/share/url?url=${encodeURIComponent(getReferralLink())}&text=${encodeURIComponent("Join FlowChain and start earning rewards!")}`
    window.open(url, "_blank")
  }

  const shareToTwitter = () => {
    const message = `Join FlowChain and start earning rewards! Use my referral link: ${getReferralLink()} #FlowChain #Crypto #Rewards`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getReferralLink())}`
    window.open(url, "_blank")
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join FlowChain",
          text: "Join FlowChain and start earning rewards!",
          url: getReferralLink(),
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      copyReferralLink()
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
      // Get participant ID via API
      const meRes = await fetch(`/api/participant/me?email=${encodeURIComponent(participantData?.email || "")}`)
      const meJson = await meRes.json()
      const participantRecord: any = meJson.participant

      if (!participantRecord) {
        
        toast({
          title: "Error",
          description: "Failed to get participant ID",
          variant: "destructive",
        })
        setIsSending(false)
        return
      }

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
        toast({
          title: "Failed to Send",
          description: "Unable to send invites. Please try again.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Unable to connect. Please check your connection and try again.",
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

        {/* Share Referral Link Card */}
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-lg">Share Your Referral Link</h3>
            </div>
            
            {/* Referral Link Display */}
            <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-2">Your unique referral link:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-lg p-3 border border-slate-200 overflow-hidden">
                  <code className="text-sm text-purple-700 break-all">
                    {typeof window !== "undefined" 
                      ? `${window.location.origin}/participant/register?ref=${participantData?.referral_code}` 
                      : `/participant/register?ref=${participantData?.referral_code}`}
                  </code>
                </div>
                <Button
                  onClick={copyReferralLink}
                  variant="outline"
                  size="icon"
                  className={`h-12 w-12 flex-shrink-0 transition-all ${copied ? "bg-emerald-100 border-emerald-300" : "bg-white"}`}
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-slate-600" />}
                </Button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Share directly to:</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <Button
                  onClick={shareToWhatsApp}
                  className="h-12 text-white font-semibold"
                  style={{ background: "#25D366" }}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>

                {/* Telegram */}
                <Button
                  onClick={shareToTelegram}
                  className="h-12 text-white font-semibold"
                  style={{ background: "#0088cc" }}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </Button>

                {/* Twitter/X */}
                <Button
                  onClick={shareToTwitter}
                  className="h-12 text-white font-semibold"
                  style={{ background: "#000000" }}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X (Twitter)
                </Button>

                {/* Facebook */}
                <Button
                  onClick={shareToFacebook}
                  className="h-12 text-white font-semibold"
                  style={{ background: "#1877F2" }}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
              </div>

              {/* Native Share Button (for mobile) */}
              <Button
                onClick={nativeShare}
                variant="outline"
                className="w-full h-12 border-2 border-purple-200 text-purple-700 font-semibold hover:bg-purple-50"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                More Sharing Options
              </Button>
            </div>
          </CardContent>
        </Card>

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
