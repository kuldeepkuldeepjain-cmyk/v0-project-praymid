"use client"

import { CheckCircle, Clock, XCircle, AlertTriangle, Circle, Ban, DollarSign, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusType =
  | "active"
  | "inactive"
  | "pending"
  | "confirmed"
  | "rejected"
  | "flagged"
  | "suspended"
  | "eligible"
  | "processing"
  | "verified"

interface StatusBadgeProps {
  status: StatusType
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

const statusConfig: Record<
  StatusType,
  {
    icon: typeof CheckCircle
    label: string
    className: string
  }
> = {
  active: {
    icon: CheckCircle,
    label: "Active",
    className: "status-badge-active",
  },
  inactive: {
    icon: Circle,
    label: "Inactive",
    className: "status-badge-inactive",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "status-badge-pending",
  },
  confirmed: {
    icon: CheckCircle,
    label: "Confirmed",
    className: "status-badge-confirmed",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "status-badge-rejected",
  },
  flagged: {
    icon: AlertTriangle,
    label: "Flagged",
    className: "status-badge-flagged",
  },
  suspended: {
    icon: Ban,
    label: "Suspended",
    className: "status-badge-flagged",
  },
  eligible: {
    icon: DollarSign,
    label: "Withdraw Eligible",
    className: "status-badge-eligible",
  },
  processing: {
    icon: Clock,
    label: "Processing",
    className: "status-badge-info",
  },
  verified: {
    icon: Shield,
    label: "Verified",
    className: "status-badge-active",
  },
}

export function StatusBadge({ status, className, showIcon = true, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.inactive
  const Icon = config.icon

  return (
    <span className={cn("status-badge", config.className, size === "sm" && "text-[11px] px-2 py-0.5", className)}>
      {showIcon && <Icon className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />}
      {config.label}
    </span>
  )
}

interface StatusDotProps {
  status: "online" | "offline" | "away" | "busy"
  className?: string
}

const dotColors: Record<StatusDotProps["status"], string> = {
  online: "bg-[#10b981]",
  offline: "bg-[#6b7280]",
  away: "bg-[#f59e0b]",
  busy: "bg-[#dc2626]",
}

export function StatusDot({ status, className }: StatusDotProps) {
  return <span className={cn("inline-block w-2 h-2 rounded-full", dotColors[status], className)} aria-label={status} />
}
