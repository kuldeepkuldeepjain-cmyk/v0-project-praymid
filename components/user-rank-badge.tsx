"use client"

import { Badge } from "@/components/ui/badge"
import { Crown, Medal, Award, Gem } from "lucide-react"
import type { UserRank } from "@/lib/types"

interface UserRankBadgeProps {
  rank: UserRank
  participationCount?: number
  showCount?: boolean
  size?: "sm" | "md" | "lg"
}

export function UserRankBadge({ rank, participationCount = 0, showCount = false, size = "md" }: UserRankBadgeProps) {
  const rankConfig = {
    bronze: {
      label: "Bronze",
      icon: Medal,
      bg: "bg-gradient-to-r from-[#cd7f32] to-[#b87333]",
      text: "text-white",
      minParticipations: 0,
    },
    silver: {
      label: "Silver",
      icon: Award,
      bg: "bg-gradient-to-r from-[#c0c0c0] to-[#a8a8a8]",
      text: "text-[#111827]",
      minParticipations: 5,
    },
    gold: {
      label: "Gold",
      icon: Crown,
      bg: "bg-gradient-to-r from-[#ffd700] to-[#ffb800]",
      text: "text-[#111827]",
      minParticipations: 15,
    },
    platinum: {
      label: "Platinum",
      icon: Gem,
      bg: "bg-gradient-to-r from-[#e5e4e2] to-[#b4b4b4]",
      text: "text-[#111827]",
      glow: "shadow-[0_0_15px_rgba(229,228,226,0.5)]",
      minParticipations: 30,
    },
  }

  const config = rankConfig[rank] || rankConfig.bronze
  const Icon = config.icon

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Badge
      className={`${config.bg} ${config.text} ${config.glow || ""} ${sizeClasses[size]} font-medium gap-1.5 border-0`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
      {showCount && <span className="opacity-75">({participationCount})</span>}
    </Badge>
  )
}

export function calculateRank(participationCount: number): UserRank {
  if (participationCount >= 30) return "platinum"
  if (participationCount >= 15) return "gold"
  if (participationCount >= 5) return "silver"
  return "bronze"
}
