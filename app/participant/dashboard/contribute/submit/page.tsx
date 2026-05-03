"use client"

import type React from "react"
import { PageLoader } from "@/components/ui/page-loader"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2, Loader2, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"


export default function SubmitContributionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [transactionHash, setTransactionHash] = useState("")
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false)
  const [checkingPending, setCheckingPending] = useState(true)

  const isAuthenticated = isParticipantAuthenticated()

  const checkPendingSubmission = async () => {
    setCheckingPending(true)
    try {
      const res = await fetch(`/api/participant/contributions/matched?email=${encodeURIComponent(participantData?.email || "")}`)
      const data = await res.json()
      setHasPendingSubmission(!!(data.pending || data.matched))
    } catch (err) {
      console.error("Error checking pending submission:", err)
      setHasPendingSubmission(false)
    } finally {
      setCheckingPending(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }
    const storedData = localStorage.getItem("participantData")
    if (storedData) {
      setParticipantData(JSON.parse(storedData))
    }
  }, [router, isAuthenticated])

  useEffect(() => {
    if (participantData?.email) {
      checkPendingSubmission()
    }
  }, [participantData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshot(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!transactionHash || !screenshot) {
      toast({
        title: "Missing Information",
        description: "Please provide both transaction hash and screenshot",
        variant: "destructive",
      })
      return
    }

    // Double-check for pending submission before proceeding
    if (hasPendingSubmission) {
      toast({
        title: "Submission Already Pending",
        description: "You already have a payment awaiting approval. Please wait for verification.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Request Timeout",
        description: "The submission is taking too long. Please check your internet connection and try again.",
        variant: "destructive",
      })
    }, 30000) // 30 second timeout

    try {

      
      // Validate screenshot size (base64 can be very large)
      const screenshotSize = screenshot.length
      
      if (screenshotSize > 10000000) { // ~10MB in base64
        toast({
          title: "File Too Large",
          description: "Screenshot must be less than 10MB. Please compress or resize the image.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        clearTimeout(timeoutId)
        return
      }

      console.log("[v0] Calling submit-payment API...")
      
      // Use the API route instead of direct Supabase insert
      const response = await fetch("/api/participant/submit-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: participantData.email,
          wallet: participantData.wallet_address || participantData.bep20_address || "",
          paymentMethod: "USDT_BEP20",
          screenshot: screenshot,
          transactionHash: transactionHash,
          bep20Address: participantData.bep20_address,
        }),
      })

      console.log("[v0] API response status:", response.status)
      const data = await response.json()
      console.log("[v0] API response data:", data)

      if (!response.ok) {
        console.error("[v0] API error:", data)
        throw new Error(data.message || data.error || "Failed to submit payment")
      }

      // Clear the timeout
      clearTimeout(timeoutId)

      // Set pending submission state immediately
      setHasPendingSubmission(true)

      toast({
        title: "Submission Successful!",
        description: "Your contribution is being verified. You'll be notified once approved.",
      })
      
      setIsSubmitting(false)

      // Clear form
      setTransactionHash("")
      setScreenshot(null)

    } catch (error: unknown) {
      clearTimeout(timeoutId)
      const err = error as Error
      console.error("[v0] Submission error:", err.message || err)
      
      toast({
        title: "Submission Failed",
        description: err.message || "Please try again or contact support",
        variant: "destructive",
      })
      
      setIsSubmitting(false)
    }
  }

  if (!mounted || !participantData || checkingPending) {
    return <PageLoader variant="subpage" />
  }

  // If user already has pending submission, show status page
  if (hasPendingSubmission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-24">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-40">
          <div className="px-4 py-4 flex items-center gap-4">
            <Link href="/participant/dashboard/contribute">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">Payment Status</h1>
          </div>
        </header>

        <main className="px-4 py-8 space-y-6 max-w-md mx-auto">
          {/* Pending Status Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Pending Approval</h2>
              <p className="text-white/90 text-sm">
                Your payment proof has been submitted and is under review.
              </p>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Payment submitted!</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Your contribution is currently under review. You will be notified once it's approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <Link href="/participant/dashboard">
            <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg">
              Back to Dashboard
            </Button>
          </Link>

          {/* Additional Info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-600">
              Verification usually takes 5-30 minutes
            </p>
            <p className="text-xs text-slate-500">
              You cannot submit another payment while one is pending
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link href="/participant/dashboard/contribute">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Submit Proof</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Transaction Hash */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label htmlFor="txHash" className="text-sm font-medium text-slate-700">
                Transaction Hash
              </Label>
              <Input
                id="txHash"
                placeholder="0x..."
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">Find this in your wallet app or on BscScan</p>
            </div>
          </CardContent>
        </Card>

        {/* Screenshot Upload */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <Label className="text-sm font-medium text-slate-700 mb-3 block">Transaction Screenshot</Label>

            {screenshot ? (
              <div className="relative">
                <img
                  src={screenshot || "/placeholder.svg"}
                  alt="Transaction screenshot"
                  className="w-full rounded-xl border border-slate-200"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 bg-transparent"
                  onClick={() => setScreenshot(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#7c3aed] hover:bg-purple-50/50 transition-colors">
                <ImageIcon className="h-10 w-10 text-slate-300 mb-3" />
                <span className="text-sm text-slate-500">Tap to upload screenshot</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!transactionHash || !screenshot || isSubmitting}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white shadow-lg shadow-purple-500/25 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Submit for Verification
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-slate-500 text-center">
          Verification usually takes 5-30 minutes. You'll receive a notification once approved.
        </p>
      </main>
    </div>
  )
}
