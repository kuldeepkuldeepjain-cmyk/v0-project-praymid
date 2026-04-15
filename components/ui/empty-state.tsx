"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Users, FileText, Bell, Search, Inbox, FolderOpen, CreditCard, Activity } from "lucide-react"

type EmptyStateType = "users" | "documents" | "notifications" | "search" | "inbox" | "files" | "payments" | "activity"

interface EmptyStateProps {
  type?: EmptyStateType
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const iconMap: Record<EmptyStateType, typeof Users> = {
  users: Users,
  documents: FileText,
  notifications: Bell,
  search: Search,
  inbox: Inbox,
  files: FolderOpen,
  payments: CreditCard,
  activity: Activity,
}

export function EmptyState({ type = "inbox", title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const Icon = iconMap[type]

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {/* Minimal line-style illustration */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border">
          <Icon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        {/* Subtle decorative elements */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/20" />
        <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-accent/20" />
      </div>

      <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>

      {description && <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>}

      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="btn-primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
