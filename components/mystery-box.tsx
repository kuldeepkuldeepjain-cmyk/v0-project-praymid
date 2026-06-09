"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, Lock, Loader2 } from "lucide-react"

interface MysteryBoxProps {
  currentBalance: number
  onRewardWon?: (amount: number) => void
  onBalanceUpdated?: (newBalance: number) => void
  participantEmail: string
}

const REWARD_TIERS = [
  { amount: 5, probability: 0.6, label: "$5 - Most Common" },
  { amount: 10, probability: 0.2, label: "$10 - Uncommon" },
  { amount: 20, probability: 0.19, label: "$20 - Rare" },
  { amount: 50, probability: 0.01, label: "$50 - Legendary" },
]

const COST_TO_OPEN = 10

export function MysteryBox({ currentBalance, onRewardWon, onBalanceUpdated, participantEmail }: MysteryBoxProps) {
  const [isOpening, setIsOpening] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [reward, setReward] = useState<number | null>(null)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const canOpen = currentBalance >= COST_TO_OPEN

  const generateReward = (): number => {
    const random = Math.random()
    let cumulativeProbability = 0

    for (const tier of REWARD_TIERS) {
      cumulativeProbability += tier.probability
      if (random <= cumulativeProbability) {
        return tier.amount
      }
    }

    return REWARD_TIERS[0].amount
  }

  const handleOpenBox = async () => {
    if (!canOpen) {
      toast({ title: "Insufficient Balance", description: `You need $${COST_TO_OPEN} to open the mystery box.`, variant: "destructive" })
      return
    }

    setIsOpening(true)
    setError(null)

    try {
      const generatedReward = generateReward()

      // Call API to process the transaction
      const response = await fetch("/api/participant/mystery-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantEmail,
          costToOpen: COST_TO_OPEN,
          reward: generatedReward,
          currentBalance,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process mystery box")
      }

      const data = await response.json()
      const updatedBalance = data.newBalance

      // Animate opening
      setIsAnimating(true)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setReward(generatedReward)
      setNewBalance(updatedBalance)
      setHasOpened(true)

      // Determine reward rarity
      const rarity = generatedReward === 50 ? "Legendary" : generatedReward === 20 ? "Rare" : generatedReward === 10 ? "Uncommon" : "Common"

      toast({
        title: `🎉 ${rarity} Reward!`,
        description: `You won $${generatedReward}! Your new balance: $${updatedBalance.toFixed(2)}`,
      })

      onRewardWon?.(generatedReward)
      onBalanceUpdated?.(updatedBalance)

      // Reset after 3 seconds
      setTimeout(() => {
        setHasOpened(false)
        setReward(null)
        setNewBalance(null)
        setIsAnimating(false)
      }, 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      setError(errorMsg)
      toast({ title: "Error", description: errorMsg, variant: "destructive" })
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              Mystery Box
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </h3>
            <p className="text-purple-200 text-sm">Win rewards up to $1000</p>
          </div>

          {/* Box Animation Container */}
          <div className="relative w-32 h-32 perspective">
            {!hasOpened ? (
              <div
                className={`w-full h-full relative cursor-pointer transition-all duration-300 ${isAnimating ? "animate-pulse" : ""}`}
                style={{
                  transformStyle: "preserve-3d",
                  animation: isAnimating ? "boxOpen 0.8s ease-out forwards" : "none",
                }}
              >
                {/* Closed Box */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-lg shadow-2xl flex flex-col items-center justify-center border-4 border-amber-300">
                  {/* Box body */}
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    {/* Gold frame effect */}
                    <div className="absolute inset-1 rounded border-2 border-amber-200 opacity-40" />

                    {/* Lock */}
                    <Lock className="h-12 w-12 text-amber-900 mb-3 drop-shadow-lg" />

                    {/* Top lid shine */}
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-yellow-300 to-transparent rounded-t opacity-50" />

                    {/* Sparkles around box */}
                    <div className="absolute -top-2 -left-2 text-yellow-300 text-lg">✨</div>
                    <div className="absolute -bottom-2 -right-2 text-yellow-300 text-lg">✨</div>
                  </div>
                </div>

                {/* Animated glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 rounded-lg blur-lg opacity-50 animate-pulse" />
              </div>
            ) : (
              /* Opened Box with Reward */
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                {/* Open box appearance */}
                <div className="text-6xl animate-bounce">📦</div>

                {/* Reward amount */}
                <div className="text-center">
                  <p className="text-sm text-purple-200 mb-2">Reward Won!</p>
                  <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">${reward}</div>
                  <p className="text-xs text-purple-300 mt-2">New Balance: ${newBalance?.toFixed(2)}</p>
                </div>

                {/* Confetti effect */}
                <div className="relative w-full h-8">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute animate-confetti"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animation: `confetti 0.8s ease-out forwards`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      {["🎉", "✨", "⭐"][Math.floor(Math.random() * 3)]}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reward Information */}
          <div className="w-full bg-purple-800/50 rounded-lg p-4 border border-purple-700">
            <div className="text-xs text-purple-300 space-y-1">
              <p className="font-semibold text-purple-100 mb-2">Reward Distribution:</p>
              {REWARD_TIERS.map((tier) => (
                <div key={tier.amount} className="flex items-center justify-between">
                  <span>{tier.label}</span>
                  <span className="text-yellow-400 font-semibold">{(tier.probability * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Information */}
          <div className="w-full text-center bg-purple-700/30 rounded-lg p-3 border border-purple-600">
            <p className="text-sm text-purple-100">
              <span className="font-semibold">Cost to Open:</span> ${COST_TO_OPEN}
            </p>
            <p className="text-xs text-purple-300 mt-1">Current Balance: ${currentBalance.toFixed(2)}</p>
          </div>

          {/* Error Message */}
          {error && <div className="w-full text-sm text-red-400 bg-red-900/20 border border-red-700 rounded p-3">{error}</div>}

          {/* Open Button */}
          <Button
            onClick={handleOpenBox}
            disabled={!canOpen || isOpening || hasOpened}
            className={`w-full h-12 font-bold text-lg transition-all duration-300 ${
              canOpen
                ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-900"
                : "bg-slate-400 text-slate-600 cursor-not-allowed"
            }`}
          >
            {isOpening ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Opening...
              </>
            ) : hasOpened ? (
              "Opening..."
            ) : canOpen ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Open Mystery Box (${COST_TO_OPEN})
              </>
            ) : (
              `Insufficient Balance (need $${COST_TO_OPEN})`
            )}
          </Button>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes boxOpen {
          0% {
            transform: scale(1) rotateY(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.1) rotateY(45deg) rotateX(10deg);
          }
          100% {
            transform: scale(0.8) rotateY(90deg);
            opacity: 0;
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(40px) translateX(${Math.random() * 40 - 20}px) rotate(360deg);
            opacity: 0;
          }
        }

        .perspective {
          perspective: 1200px;
        }

        .animate-confetti {
          animation: confetti 0.8s ease-out forwards;
        }
      `}</style>
    </Card>
  )
}
