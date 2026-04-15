"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Sparkles, ArrowRight, Gift, Trophy, Zap } from "lucide-react"

interface ActivationSuccessModalProps {
  onContinue: () => void
  bonusPoints?: number
}

export function ActivationSuccessModal({ onContinue, bonusPoints = 100 }: ActivationSuccessModalProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-pink-200/60 via-orange-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-violet-200/50 via-purple-100/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-t from-amber-100/40 via-yellow-50/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles
                className="h-4 w-4"
                style={{ color: ["#7c3aed", "#E85D3B", "#f59e0b", "#10b981"][Math.floor(Math.random() * 4)] }}
              />
            </div>
          ))}
        </div>
      )}

      <Card className="max-w-md w-full bg-white border border-slate-200 shadow-2xl overflow-hidden relative z-10">
        <div className="h-2 bg-gradient-to-r from-violet-500 via-[#E85D3B] to-emerald-500" />
        <CardContent className="p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-amber-400 flex items-center justify-center shadow-lg animate-bounce">
              <Gift className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Account Activated!</h2>
            <p className="text-slate-500">Welcome to FlowChain! Your account is now fully activated.</p>
          </div>

          {/* Bonus Points */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <span className="text-lg font-bold text-amber-700">+{bonusPoints} Bonus Points</span>
            </div>
            <p className="text-sm text-amber-600">Welcome bonus added to your account</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-500">You now have access to:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Trophy, label: "Daily Rewards" },
                { icon: Gift, label: "Challenges" },
                { icon: Zap, label: "Auto Payouts" },
                { icon: Sparkles, label: "Exclusive Events" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Icon className="h-4 w-4 text-violet-500" />
                  <span className="text-sm text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onContinue}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-[#E85D3B] to-[#d94f30] hover:from-[#d94f30] hover:to-[#c44528] text-white rounded-xl shadow-lg shadow-orange-200"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
