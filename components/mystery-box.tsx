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
  { amount: 5, probability: 0.6 },
  { amount: 10, probability: 0.2 },
  { amount: 20, probability: 0.19 },
  { amount: 50, probability: 0.01 },
]

const COST_TO_OPEN = 10
const NUMBER_OF_BOXES = 10

export function MysteryBox({ currentBalance, onRewardWon, onBalanceUpdated, participantEmail }: MysteryBoxProps) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
  const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set())
  const [isOpening, setIsOpening] = useState(false)
  const [reward, setReward] = useState<number | null>(null)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [showReward, setShowReward] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingBoxIndex, setOpeningBoxIndex] = useState<number | null>(null)
  const { toast } = useToast()

  const canOpen = currentBalance >= COST_TO_OPEN && selectedBox !== null && !openedBoxes.has(selectedBox)

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

  const handleSelectBox = (boxIndex: number) => {
    if (!openedBoxes.has(boxIndex)) {
      setSelectedBox(selectedBox === boxIndex ? null : boxIndex)
    }
  }

  const handleOpenBox = async () => {
    if (!canOpen) {
      if (selectedBox === null || selectedBox === undefined) {
        toast({ title: "Select a Box", description: "Please select a mystery box to open.", variant: "destructive" })
      } else if (openedBoxes.has(selectedBox)) {
        toast({ title: "Already Opened", description: "This box has already been opened.", variant: "destructive" })
      } else {
        toast({
          title: "Insufficient Balance",
          description: `You need $${COST_TO_OPEN} to open a mystery box.`,
          variant: "destructive",
        })
      }
      return
    }

    setIsOpening(true)
    setOpeningBoxIndex(selectedBox)
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
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to process mystery box")
      }

      const data = await response.json()
      const updatedBalance = data.newBalance

      // Animate opening - wait for 3D flip animation
      await new Promise((resolve) => setTimeout(resolve, 1200))

      setReward(generatedReward)
      setNewBalance(updatedBalance)
      setShowReward(true)

      // Mark box as opened
      const newOpenedBoxes = new Set(openedBoxes)
      newOpenedBoxes.add(selectedBox!)
      setOpenedBoxes(newOpenedBoxes)

      // Determine reward rarity
      const rarity =
        generatedReward === 50 ? "Legendary" : generatedReward === 20 ? "Rare" : generatedReward === 10 ? "Uncommon" : "Common"

      toast({
        title: `🎉 ${rarity} Reward!`,
        description: `You won $${generatedReward}! Your new balance: $${updatedBalance.toFixed(2)}`,
      })

      onRewardWon?.(generatedReward)
      onBalanceUpdated?.(updatedBalance)

      // Reset after 4 seconds
      setTimeout(() => {
        setShowReward(false)
        setReward(null)
        setNewBalance(null)
        setSelectedBox(null)
        setOpeningBoxIndex(null)
      }, 4000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      console.error("[v0] Mystery box error:", errorMsg)
      setError(errorMsg)
      toast({ title: "Error", description: errorMsg, variant: "destructive" })
      setOpeningBoxIndex(null)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <CardContent className="p-8">
        <style>{`
          @keyframes boxBounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-12px) scale(1.05); }
          }
          @keyframes boxRotate3d {
            0% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
            50% { transform: perspective(1000px) rotateY(180deg) rotateX(10deg); }
            100% { transform: perspective(1000px) rotateY(360deg) rotateX(0deg); }
          }
          @keyframes boxFlip {
            0% { transform: perspective(1000px) rotateY(0deg); }
            100% { transform: perspective(1000px) rotateY(180deg); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(168, 85, 247, 0.1); }
            50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.8), inset 0 0 20px rgba(168, 85, 247, 0.3); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes confetti {
            0% { opacity: 1; transform: translateY(0) rotate(0deg); }
            100% { opacity: 0; transform: translateY(-60px) rotate(360deg); }
          }
        `}</style>

        <div className="flex flex-col items-center gap-8">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-yellow-400" />
              Mystery Boxes
              <Sparkles className="h-7 w-7 text-yellow-400" />
            </h3>
            <p className="text-purple-200 text-sm">Choose one box and win rewards up to $1000</p>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-purple-200 text-xs mb-1">Cost to Open</p>
              <p className="text-yellow-300 font-bold text-lg">${COST_TO_OPEN}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-purple-200 text-xs mb-1">Your Balance</p>
              <p className={`font-bold text-lg ${currentBalance >= COST_TO_OPEN ? "text-green-300" : "text-red-300"}`}>
                ${currentBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Boxes Grid */}
          <div className="grid grid-cols-5 gap-4 w-full max-w-2xl">
            {Array.from({ length: NUMBER_OF_BOXES }).map((_, index) => {
              const isSelected = selectedBox === index
              const isOpened = openedBoxes.has(index)
              const isCurrentlyOpening = openingBoxIndex === index

              return (
                <div key={index} className="flex justify-center">
                  <button
                    onClick={() => handleSelectBox(index)}
                    disabled={isOpened || isOpening}
                    className={`
                      relative w-24 h-28 rounded-lg transition-all duration-300 
                      transform cursor-pointer disabled:cursor-not-allowed
                      ${isOpened ? "opacity-40" : "hover:scale-105"}
                      ${isSelected && !isOpened ? "scale-110" : "scale-100"}
                    `}
                    style={{
                      animation:
                        isSelected && !isOpened
                          ? "boxBounce 0.6s ease-in-out infinite"
                          : isCurrentlyOpening
                            ? "boxFlip 1.2s ease-in-out forwards"
                            : "none",
                    }}
                  >
                    {/* Box Front */}
                    <div
                      className={`
                        absolute inset-0 rounded-lg flex flex-col items-center justify-center
                        bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500
                        border-2 border-yellow-300 shadow-lg
                        transition-all duration-300
                        ${isCurrentlyOpening ? "opacity-0" : "opacity-100"}
                        ${isOpened ? "from-gray-400 to-gray-500" : ""}
                      `}
                      style={{
                        backfaceVisibility: "hidden",
                        animation: isSelected && !isOpened && !isCurrentlyOpening ? "glow 2s ease-in-out infinite" : "none",
                      }}
                    >
                      {!isOpened && (
                        <>
                          <Lock className="h-6 w-6 text-amber-900 mb-1" />
                          <span className="text-xs font-bold text-amber-900">$10</span>
                        </>
                      )}
                      {isOpened && (
                        <div className="text-xl">✓</div>
                      )}
                    </div>

                    {/* Box Back - Opened State */}
                    <div
                      className={`
                        absolute inset-0 rounded-lg flex items-center justify-center
                        bg-gradient-to-br from-green-400 to-emerald-500
                        border-2 border-green-300 shadow-lg
                        transition-all duration-300
                        ${isCurrentlyOpening ? "opacity-100" : "opacity-0"}
                      `}
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <Loader2 className="h-6 w-6 text-green-900 animate-spin" />
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Reward Display */}
          {showReward && (
            <div className="relative w-full max-w-md">
              <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-lg p-6 text-center shadow-2xl border-2 border-yellow-200">
                <p className="text-purple-900 font-bold text-sm mb-2">You Won!</p>
                <p className="text-5xl font-black text-white" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
                  ${reward}
                </p>
                <p className="text-purple-900 font-semibold text-sm mt-2">New Balance: ${newBalance?.toFixed(2)}</p>

                {/* Confetti */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: "0",
                      animation: `confetti 2s ease-out forwards`,
                      animationDelay: `${Math.random() * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="w-full max-w-md bg-red-500/20 border border-red-500 rounded-lg p-3 text-center text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-md">
            <Button
              onClick={() => setSelectedBox(null)}
              variant="outline"
              className="flex-1 border-purple-400 text-purple-300 hover:bg-purple-800"
              disabled={isOpening}
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleOpenBox}
              disabled={!canOpen || isOpening}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-50"
            >
              {isOpening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                `Open Box ($${COST_TO_OPEN})`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
