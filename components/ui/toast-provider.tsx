"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastClasses: Record<ToastType, string> = {
  success: "toast-success",
  error: "toast-error",
  warning: "toast-warning",
  info: "toast-info",
}

const toastIconColors: Record<ToastType, string> = {
  success: "text-[#10b981]",
  error: "text-[#dc2626]",
  warning: "text-[#f59e0b]",
  info: "text-[#3b82f6]",
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = toastIcons[toast.type]

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(onRemove, 150)
  }, [onRemove])

  // Auto dismiss
  useState(() => {
    const timer = setTimeout(handleRemove, toast.duration || 4500)
    return () => clearTimeout(timer)
  })

  return (
    <div
      className={cn("toast", toastClasses[toast.type], isExiting ? "animate-toast-out" : "animate-toast-in")}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", toastIconColors[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.message && <p className="text-sm text-muted-foreground mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded hover:bg-secondary transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
