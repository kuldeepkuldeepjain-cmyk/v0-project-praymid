"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, CreditCard, TrendingUp, Shield, Globe, BookOpen, Clock, DollarSign, Zap } from "lucide-react"

interface LearnMoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LearnMoreDialog({ open, onOpenChange }: LearnMoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#E85D3B] to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#E85D3B]" />
            How FlowChain Works
          </DialogTitle>
          <DialogDescription>World's first platform that doubles your investment in just 1 month</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Introduction */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-cyan-50 border border-purple-200">
            <p className="text-slate-700 leading-relaxed">
              FlowChain is a revolutionary platform that connects participants in a structured contribution network. By
              making secure contributions and helping others, you unlock earning potential and climb through our rank
              system.
            </p>
          </div>

          {/* Revolutionary Claims Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-200">
            <h3 className="font-bold text-lg text-emerald-900 mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              Revolutionary Platform
            </h3>
            <p className="text-slate-700 leading-relaxed mb-3">
              FlowChain is the world's first platform that compounds your money into 2X in just 1 month! With our
              innovative contribution network and guaranteed returns system, you'll see results within 24 hours.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-emerald-200">
                <Clock className="h-5 w-5 text-emerald-600 mb-1" />
                <p className="text-xs font-semibold text-slate-900">24/7 Support</p>
                <p className="text-xs text-slate-600">Always here for you</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-emerald-200">
                <DollarSign className="h-5 w-5 text-emerald-600 mb-1" />
                <p className="text-xs font-semibold text-slate-900">2X Returns</p>
                <p className="text-xs text-slate-600">Double in 30 days</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-emerald-200">
                <Zap className="h-5 w-5 text-emerald-600 mb-1" />
                <p className="text-xs font-semibold text-slate-900">Instant Results</p>
                <p className="text-xs text-slate-600">Within 24 hours</p>
              </div>
            </div>
          </div>

          {/* How It Works Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900">Getting Started</h3>

            <div className="space-y-3">
              {[
                {
                  icon: Users,
                  title: "1. Create Your Account",
                  description:
                    "Sign up with your details and complete your profile setup. Pay the one-time activation fee of $100 to unlock your account.",
                  color: "from-[#E85D3B] to-orange-600",
                },
                {
                  icon: CreditCard,
                  title: "2. Make Your Contribution",
                  description:
                    "Submit your contribution of $100 through secure crypto (BEP20) or bank transfer. Your payment is automatically verified by our system.",
                  color: "from-purple-500 to-indigo-600",
                },
                {
                  icon: TrendingUp,
                  title: "3. Start Earning Rewards",
                  description:
                    "Once verified, save your BEP20 wallet address to receive payments. Watch your investment grow to 2X within 30 days!",
                  color: "from-cyan-500 to-blue-600",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  >
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900">Why Choose FlowChain?</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Shield, text: "Bank-grade security" },
                { icon: Globe, text: "150+ countries supported" },
                { icon: Clock, text: "24/7 customer support" },
                { icon: Zap, text: "Guaranteed 2X returns" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <feature.icon className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-[#E85D3B] to-purple-600 text-white">
            <h3 className="font-bold text-lg mb-2">Ready to Double Your Investment?</h3>
            <p className="text-white/90 text-sm mb-4">
              Join thousands of participants who are already earning 2X returns through our revolutionary platform.
            </p>
            <Button
              size="lg"
              className="w-full bg-white text-[#E85D3B] hover:bg-white/90 font-semibold shadow-lg"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
