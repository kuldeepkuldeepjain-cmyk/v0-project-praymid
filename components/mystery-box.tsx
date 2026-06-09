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
  const [isAnimating, setIsAnimating] = useState(false)
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
      if (!selectedBox && selectedBox !== 0) {
        toast({ title: "Select a Box", description: "Please select a mystery box to open.", variant: "destructive" })
      } else if (openedBoxes.has(selectedBox)) {
        toast({ title: "Already Opened", description: "This box has already been opened.", variant: "destructive" })
      } else {
        toast({ 
          title: "Insufficient Balance", 
          description: `You need $${COST_TO_OPEN} to open a mystery box.`, 
          variant: "destructive" 
        })
      }
      return
    }

    setIsOpening(true)
    setError(null)
    setIsAnimating(true)

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
      await new Promise((resolve) => setTimeout(resolve, 800))

      setReward(generatedReward)
      setNewBalance(updatedBalance)
      setShowReward(true)

      // Mark box as opened
      const newOpenedBoxes = new Set(openedBoxes)
      newOpenedBoxes.add(selectedBox!)
      setOpenedBoxes(newOpenedBoxes)

      // Determine reward rarity
      const rarity = 
        generatedReward === 50 ? "Legendary" : 
        generatedReward === 20 ? "Rare" : 
        generatedReward === 10 ? "Uncommon" : 
        "Common"

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
        setIsAnimating(false)
        setSelectedBox(null)
      }, 4000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      setError(errorMsg)
      toast({ title: "Error", description: errorMsg, variant: "destructive" })
      setIsAnimating(false)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <CardContent className="p-8">
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

          {/* Boxes Grid */}
          <div className="w-full grid grid-cols-5 gap-4 md:gap-3">
            {[...Array(NUMBER_OF_BOXES)].map((_, boxIndex) => {
              const isSelected = selectedBox === boxIndex
              const isOpened = openedBoxes.has(boxIndex)

              return (
                <button
                  key={boxIndex}
                  onClick={() => handleSelectBox(boxIndex)}
                  disabled={isOpened || isAnimating}
                  className={`relative aspect-square transition-all duration-300 transform ${
                    isOpened 
                      ? "opacity-30 cursor-not-allowed" 
                      : isSelected 
                      ? "scale-110 -translate-y-2" 
                      : "hover:scale-105 hover:-translate-y-1"
                  }`}
                >
                  {/* Box Container */}
                  <div
                    className={`w-full h-full rounded-lg flex flex-col items-center justify-center relative shadow-lg transition-all duration-300 ${
                      isOpened
                        ? "bg-gray-600 border-2 border-gray-700"
                        : isSelected
                        ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 border-4 border-yellow-200 shadow-2xl"
                        : "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-3 border-amber-300 hover:shadow-2xl"
                    }`}
                  >
                    {/* Gold shine effect */}
                    <div className={`absolute inset-1 rounded-lg border border-amber-200 opacity-40 ${isSelected ? "opacity-60" : ""}`} />

                    {/* Box content */}
                    {isOpened ? (
                      <div className="relative z-10 text-center">
                        <div className="text-2xl">✓</div>
                        <div className="text-xs text-gray-800 font-bold mt-1">Opened</div>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        {isSelected && <Sparkles className="h-5 w-5 text-amber-900 animate-spin" />}
                        <Lock className={`h-6 w-6 transition-all duration-300 ${isSelected ? "text-amber-900 scale-125" : "text-amber-900"}`} />
                        <div className="text-xs font-bold text-amber-900 text-center leading-tight">
                          ${COST_TO_OPEN}
                        </div>
                      </div>
                    )}

                    {/* Top shine */}
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-yellow-200 to-transparent rounded-t-lg opacity-40" />
                  </div>

                  {/* Selection glow */}
                  {isSelected && (
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 rounded-lg blur-md opacity-50 animate-pulse -z-10" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Info Box */}
          <div className="w-full bg-purple-700/30 rounded-lg p-4 border border-purple-600">
            <div className="text-sm text-purple-100 space-y-2">
              <p>
                <span className="font-semibold">Current Balance:</span> ${currentBalance.toFixed(2)}
              </p>
              <p>
                <span className="font-semibold">Boxes Opened:</span> {openedBoxes.size} / {NUMBER_OF_BOXES}
              </p>
              {selectedBox !== null && (
                <p>
                  <span className="font-semibold">Selected Box:</span> #{selectedBox + 1}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full text-sm text-red-400 bg-red-900/20 border border-red-700 rounded p-3">
              {error}
            </div>
          )}

          {/* Reward Display */}
          {showReward && reward !== null && (
            <div className="w-full bg-gradient-to-r from-yellow-400/20 to-amber-400/20 border-2 border-yellow-400 rounded-lg p-6 text-center animate-pulse">
              <p className="text-purple-200 text-sm mb-2">You Won!</p>
              <div className="text-6xl font-bold text-yellow-400 drop-shadow-lg mb-2">${reward}</div>
              <p className="text-xs text-purple-300">New Balance: ${newBalance?.toFixed(2)}</p>
              
              {/* Confetti */}
              <div className="mt-4 flex justify-center gap-2 text-2xl">
                {["🎉", "✨", "⭐"].map((emoji, i) => (
                  <div
                    key={i}
                    className="animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Button */}
          <Button
            onClick={handleOpenBox}
            disabled={!canOpen || isOpening}
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
            ) : !selectedBox && selectedBox !== 0 ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Select a Box
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Open Box #{selectedBox! + 1} (${COST_TO_OPEN})
              </>
            )}
          </Button>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </Card>
  )
}
