"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, Loader2 } from "lucide-react"

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
const CHEST_IMAGE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/chest%201-f2PpAqlqkVDMjeMwAr5KC20nylScuT.png"

export function MysteryBox({ currentBalance, onRewardWon, onBalanceUpdated, participantEmail }: MysteryBoxProps) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
  const [openedBoxIndex, setOpenedBoxIndex] = useState<number | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [reward, setReward] = useState<number | null>(null)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [showReward, setShowReward] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chestOrder, setChestOrder] = useState<number[]>([])
  const { toast } = useToast()

  // Initialize shuffled chest order on mount
  useEffect(() => {
    reshuffleChests()
  }, [])

  const reshuffleChests = () => {
    // Create array [0, 1, 2, ..., 9]
    const indices = Array.from({ length: NUMBER_OF_BOXES }, (_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    setChestOrder(indices)
    setSelectedBox(null)
    setOpenedBoxIndex(null)
  }

  const canOpen = currentBalance >= COST_TO_OPEN && selectedBox !== null && openedBoxIndex === null

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
    if (openedBoxIndex === null) {
      setSelectedBox(selectedBox === boxIndex ? null : boxIndex)
    }
  }

  const handleOpenBox = async () => {
    if (!canOpen) {
      if (selectedBox === null || selectedBox === undefined) {
        toast({ title: "Select a Box", description: "Please select a mystery box to open.", variant: "destructive" })
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
    setOpenedBoxIndex(selectedBox)
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

      // Animate opening - wait for chest animation
      await new Promise((resolve) => setTimeout(resolve, 1200))

      setReward(generatedReward)
      setNewBalance(updatedBalance)
      setShowReward(true)

      // Determine reward rarity
      const rarity =
        generatedReward === 50 ? "Legendary" : generatedReward === 20 ? "Rare" : generatedReward === 10 ? "Uncommon" : "Common"

      toast({
        title: `🎉 ${rarity} Reward!`,
        description: `You won $${generatedReward}! Your new balance: $${updatedBalance.toFixed(2)}`,
      })

      onRewardWon?.(generatedReward)
      onBalanceUpdated?.(updatedBalance)

      // Reset and reshuffle after 3 seconds
      setTimeout(() => {
        setShowReward(false)
        setReward(null)
        setNewBalance(null)
        reshuffleChests()
      }, 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      console.error("[v0] Mystery box error:", errorMsg)
      setError(errorMsg)
      toast({ title: "Error", description: errorMsg, variant: "destructive" })
      setOpenedBoxIndex(null)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg" style={{
      background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(232, 93, 59, 0.06) 35%, rgba(16, 185, 129, 0.05) 100%)",
      border: "1px solid rgba(124, 58, 237, 0.15)",
      boxShadow: "0 12px 40px rgba(124, 58, 237, 0.15), 0 4px 12px rgba(232, 93, 59, 0.1)"
    }}>
      <CardContent className="p-8">
        <style>{`
          @keyframes chestBounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-8px) scale(1.02); }
          }
          @keyframes chestGlow {
            0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(168, 85, 247, 0.2); }
            50% { box-shadow: 0 0 25px rgba(251, 191, 36, 0.6), 0 0 40px rgba(168, 85, 247, 0.4); }
          }
          @keyframes chestOpen {
            0% { transform: perspective(1000px) rotateY(0deg) scale(1); }
            50% { transform: perspective(1000px) rotateY(90deg) scale(1.05); }
            100% { transform: perspective(1000px) rotateY(180deg) scale(0.95); }
          }
          @keyframes confetti {
            0% { opacity: 1; transform: translateY(0) rotate(0deg); }
            100% { opacity: 0; transform: translateY(-60px) rotate(360deg); }
          }
        `}</style>

        <div className="flex flex-col items-center gap-8">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-purple-700 mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-orange-500" />
              Mystery Chests
              <Sparkles className="h-7 w-7 text-orange-500" />
            </h3>
            <p className="text-slate-600 text-sm">Choose one chest and win rewards up to $1000</p>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 backdrop-blur rounded-lg p-3 text-center border border-purple-200">
              <p className="text-purple-600 text-xs mb-1 font-semibold">Cost to Open</p>
              <p className="text-purple-700 font-bold text-lg">${COST_TO_OPEN}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 backdrop-blur rounded-lg p-3 text-center border border-emerald-200">
              <p className="text-emerald-600 text-xs mb-1 font-semibold">Your Balance</p>
              <p className={`font-bold text-lg ${currentBalance >= COST_TO_OPEN ? "text-emerald-600" : "text-red-500"}`}>
                ${currentBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Chests Grid */}
          <div className="grid grid-cols-5 gap-4 w-full max-w-3xl">
            {Array.from({ length: NUMBER_OF_BOXES }).map((_, idx) => {
              const isSelected = selectedBox === idx
              const isCurrentlyOpening = openedBoxIndex === idx

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectBox(idx)}
                  disabled={isOpening || openedBoxIndex !== null}
                  className={`
                    relative w-full aspect-square rounded-lg overflow-hidden transition-all duration-300 
                    transform cursor-pointer disabled:cursor-not-allowed
                    ${isSelected && !isCurrentlyOpening ? "scale-110" : "scale-100"}
                    ${!isCurrentlyOpening && !isOpening ? "hover:scale-105" : ""}
                  `}
                  style={{
                    animation:
                      isSelected && !isCurrentlyOpening && !isOpening
                        ? "chestBounce 0.6s ease-in-out infinite"
                        : isCurrentlyOpening
                          ? "chestOpen 1.2s ease-in-out forwards"
                          : "none",
                  }}
                >
                  {/* Chest Image */}
                  <img
                    src={CHEST_IMAGE}
                    alt="Mystery Chest"
                    className="w-full h-full object-cover"
                  />

                  {/* Selection Glow Overlay */}
                  {isSelected && !isCurrentlyOpening && !isOpening && (
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        animation: "chestGlow 2s ease-in-out infinite",
                        boxShadow: "inset 0 0 15px rgba(251, 191, 36, 0.5)",
                      }}
                    />
                  )}

                  {/* Selection Border */}
                  {isSelected && !isCurrentlyOpening && !isOpening && (
                    <div className="absolute inset-0 rounded-lg border-3 border-yellow-400" />
                  )}

                  {/* Opening Overlay */}
                  {isCurrentlyOpening && (
                    <div className="absolute inset-0 bg-gradient-to-t from-green-500/50 to-transparent flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}

                  {/* Price Tag */}
                  {!isCurrentlyOpening && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 text-center">
                      <p className="text-xs font-bold text-yellow-300">$10</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Reward Display */}
          {showReward && (
            <div className="relative w-full max-w-md">
              <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-lg p-6 text-center shadow-2xl border-2 border-yellow-200">
                <p className="text-purple-900 font-bold text-sm mb-2">🎉 You Won! 🎉</p>
                <p className="text-6xl font-black text-white" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
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
              <p className="text-center text-gray-400 text-sm mt-3">Reshuffling new chests...</p>
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
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-100"
              disabled={isOpening || openedBoxIndex !== null}
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleOpenBox}
              disabled={!canOpen || isOpening}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
            >
              {isOpening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                `Open Chest ($${COST_TO_OPEN})`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
