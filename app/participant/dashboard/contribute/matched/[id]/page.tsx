"use client"

import { useState, useEffect, Suspense } from "react"
import { PageLoader } from "@/components/ui/page-loader"
import { useRouter, useParams } from "next/navigation"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, User, Mail, Wallet, DollarSign, Calendar, Clock, Copy, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface MatchedDetails {
  contribution: {
    id: string
    amount: number
    status: string
    created_at: string
    matched_at: string
  }
  payout: {
    id: string
    participant_email: string
    participant_name: string
    amount: number
    payout_method: string
    bank_details?: string
    wallet_address?: string
    status: string
    created_at: string
  }
}

function MatchedDetailsContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [matched, setMatched] = useState<MatchedDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFoundTriggered, setNotFoundTriggered] = useState(false)
  const contributionId = Array.isArray(params?.id) ? params.id[0] : params?.id

  useEffect(() => {
    if (!contributionId) {
      console.log("[v0] No contribution ID provided")
      setError("No contribution ID provided")
      setNotFoundTriggered(true)
      setLoading(false)
      return
    }

    const fetchMatchedDetails = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          console.log("[v0] User not authenticated, redirecting to login")
          router.push("/participant/login")
          return
        }

        console.log("[v0] Fetching matched details for contribution:", contributionId, "User email:", user.email)

        // Fetch contribution details
        const { data: contribution, error: contribError } = await supabase
          .from("payment_submissions")
          .select("id, amount, status, created_at, matched_at, matched_payout_id, participant_email")
          .eq("id", contributionId)
          .eq("participant_email", user.email)
          .maybeSingle()

        if (contribError) {
          console.error("[v0] Error fetching contribution:", contribError)
          setError(`Error: ${contribError.message}`)
          setNotFoundTriggered(true)
          setLoading(false)
          return
        }

        if (!contribution) {
          console.error("[v0] Contribution not found for ID:", contributionId)
          setError("Contribution not found")
          setNotFoundTriggered(true)
          setLoading(false)
          return
        }

        console.log("[v0] Found contribution:", contribution.id, "Status:", contribution.status, "Matched payout ID:", contribution.matched_payout_id)

        if (!contribution.matched_payout_id) {
          console.error("[v0] Contribution has no matched payout ID")
          setError("Contribution has not been matched yet")
          setNotFoundTriggered(true)
          setLoading(false)
          return
        }

        // Fetch matched payout details
        const { data: payout, error: payoutError } = await supabase
          .from("payout_requests")
          .select(
            `id, participant_email, amount, payout_method, bank_details, wallet_address, status, created_at,
            participant:participants(full_name, username)`
          )
          .eq("id", contribution.matched_payout_id)
          .maybeSingle()

        if (payoutError) {
          console.error("[v0] Error fetching payout:", payoutError)
          setError(`Error: ${payoutError.message}`)
          setNotFoundTriggered(true)
          setLoading(false)
          return
        }

        if (!payout) {
          console.error("[v0] Payout not found for ID:", contribution.matched_payout_id)
          setError("Payout details not found")
          setNotFoundTriggered(true)
          setLoading(false)
          return
        }

        console.log("[v0] Successfully loaded payout details:", payout.id)

        setMatched({
          contribution: {
            id: contribution.id,
            amount: contribution.amount,
            status: contribution.status,
            created_at: contribution.created_at,
            matched_at: contribution.matched_at,
          },
          payout: {
            id: payout.id,
            participant_email: payout.participant_email,
            participant_name: (payout.participant as any)?.full_name || (payout.participant as any)?.username || "Unknown",
            amount: payout.amount,
            payout_method: payout.payout_method,
            bank_details: payout.bank_details,
            wallet_address: payout.wallet_address,
            status: payout.status,
            created_at: payout.created_at,
          },
        })
        setError(null)
      } catch (err) {
        console.error("[v0] Error fetching matched details:", err)
        setError("An unexpected error occurred")
        setNotFoundTriggered(true)
      } finally {
        setLoading(false)
      }
    }

    fetchMatchedDetails()
  }, [contributionId, router])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Trigger not found when data fetch fails
  if (notFoundTriggered && !loading && !matched) {
    notFound()
  }

  if (loading) {
    return <PageLoader variant="detail" />
  }

  if (!matched) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/participant/dashboard/contribute">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contributions
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Contribution Matched</h1>
          <p className="text-slate-600">Your contribution has been successfully matched with a payout request</p>
        </div>

        {/* Success Banner */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Matched Successfully</h3>
              <p className="text-sm text-green-800">
                Your ${matched.contribution.amount.toFixed(2)} contribution has been matched with a payout request. Below are the recipient details.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Contribution Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Your Contribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Contribution ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-slate-100 px-3 py-1 rounded font-mono flex-1 truncate">
                    {matched.contribution.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(matched.contribution.id)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Amount</p>
                <p className="text-2xl font-bold text-slate-900">${matched.contribution.amount.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Status</p>
                <Badge className="bg-green-100 text-green-800 border-green-300">In Process</Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" />
                    Submitted
                  </p>
                  <p className="text-sm text-slate-900">{formatDate(matched.contribution.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Matched
                  </p>
                  <p className="text-sm text-slate-900">{formatDate(matched.contribution.matched_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Payout Recipient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Recipient Name</p>
                <p className="text-lg font-semibold text-slate-900">{matched.payout.participant_name}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${matched.payout.participant_email}`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-4 w-4" />
                    {matched.payout.participant_email}
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Payout Amount</p>
                <p className="text-2xl font-bold text-slate-900">${matched.payout.amount.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Payout Method</p>
                <Badge variant="outline">{matched.payout.payout_method}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payout Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {matched.payout.wallet_address && (
              <div>
                <p className="text-sm text-slate-600 mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <code className="text-sm font-mono flex-1 truncate">{matched.payout.wallet_address}</code>
                  <button
                    onClick={() => copyToClipboard(matched.payout.wallet_address!)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {matched.payout.bank_details && (
              <div>
                <p className="text-sm text-slate-600 mb-2">Bank Details</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                    {matched.payout.bank_details}
                  </pre>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-3">What's next?</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-semibold">1.</span>
                  <span>Review the payout recipient information above</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-semibold">2.</span>
                  <span>Contact the recipient if you need to discuss the payout</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-semibold">3.</span>
                  <span>Your contribution will be processed within the agreed timeframe</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <Link href="/participant/dashboard/contribute" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to Contributions
            </Button>
          </Link>
          <Link href="/participant/dashboard" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-[#E85D3B] to-[#7c3aed] hover:opacity-90">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function MatchedDetailsPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E85D3B] to-[#7c3aed] animate-pulse mx-auto" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <MatchedDetailsContent />
    </Suspense>
  )
}
