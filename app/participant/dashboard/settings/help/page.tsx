"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Mail, Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

const FAQ_ITEMS = [
  {
    question: "How does the FIFO queue system work?",
    answer:
      "The FIFO (First In, First Out) queue system processes contributions in the order they are received. When you make a contribution, you enter the queue and receive payouts as new contributions come in from other participants. Your position in the queue determines when you receive your 2x payout.",
  },
  {
    question: "How are contributions processed?",
    answer:
      "Contributions are processed automatically through our smart contract system. Once your USDT is received, you are added to the queue. When enough contributions come in from other participants, your payout is automatically sent to your registered BEP20 wallet address.",
  },
  {
    question: "How do referrals work?",
    answer:
      "When someone signs up using your referral code and makes their first contribution, you earn a $10 bonus. There's no limit to how many people you can refer. Your referral earnings are added to your wallet balance and can be withdrawn at any time.",
  },
  {
    question: "How does the prediction market work?",
    answer:
      "The prediction market allows you to predict whether BTC or ETH prices will go up or down within a 5-minute window. If your prediction is correct, you win 1.9x your bet amount. Predictions are settled automatically based on real-time price data from major exchanges.",
  },
  {
    question: "What are the withdrawal requirements?",
    answer:
      "You can withdraw your wallet balance at any time with a minimum withdrawal amount of $10. Withdrawals are processed to your registered BEP20 wallet address within 24 hours. There are no withdrawal fees.",
  },
]

export default function HelpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  })

  const isAuthenticated = isParticipantAuthenticated()

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/participant/login")
    }
  }, [router, isAuthenticated])

  const handleSubmitSupport = async () => {
    if (!supportForm.subject || !supportForm.message) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSubmitted(true)
      toast({ title: "Submitted", description: "Your support request has been sent" })
      setSupportForm({ subject: "", message: "" })
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link href="/participant/dashboard/profile">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Help & Support</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* FAQ Section */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Frequently Asked Questions</h3>
                <p className="text-sm text-slate-500">Find answers to common questions</p>
              </div>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 pr-4">{item.question}</span>
                    {expandedFAQ === index ? (
                      <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Contact Support</h3>
                <p className="text-sm text-slate-500">Can't find what you're looking for?</p>
              </div>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Request Submitted!</h4>
                <p className="text-sm text-slate-500">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="What do you need help with?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSubmitSupport} disabled={isSubmitting} className="w-full bg-[#7c3aed]">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
