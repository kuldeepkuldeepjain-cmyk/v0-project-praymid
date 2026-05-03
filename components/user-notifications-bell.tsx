"use client"

import { useEffect, useState } from "react"
import { Bell, X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read_status: boolean
  created_at: string
}

export function UserNotificationsBell({ userEmail }: { userEmail: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (userEmail) {
      fetchNotifications()
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userEmail])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/participant/notifications?email=${encodeURIComponent(userEmail)}`)
      const result = await res.json()

      if (!result.success) {
        setNotifications([])
        return
      }

      setNotifications(result.notifications || [])
      setUnreadCount(result.notifications?.filter((n: Notification) => !n.read_status).length || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/participant/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId, read_status: true }),
      })

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_status: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read_status).map((n) => n.id)
      if (unreadIds.length === 0) return

      await fetch("/api/participant/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      })

      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })))
      setUnreadCount(0)

      toast({ title: "Success", description: "All notifications marked as read" })
    } catch (error) {
      console.error("[v0] Error marking all as read:", error)
      toast({ title: "Error", description: "Failed to mark notifications as read", variant: "destructive" })
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/participant/notifications?id=${notificationId}`, { method: "DELETE" })

      const wasUnread = notifications.find((n) => n.id === notificationId)?.read_status === false
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
    }
  }

  const typeIcons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  }

  const typeColors = {
    info: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
  }

  const typeTextColors = {
    info: "text-blue-700",
    success: "text-green-700",
    warning: "text-yellow-700",
    error: "text-red-700",
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Bell Icon with Badge */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-9 rounded-full hover:bg-slate-100 w-3.5"
        >
          <Bell className="h-5 text-slate-600 w-5 mx-0" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <Card className="absolute right-0 top-12 w-96 max-h-[500px] z-50 shadow-xl border-2">
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-orange-50 to-rose-50">
              <div>
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                <p className="text-xs text-slate-500">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                  className="text-xs h-7 bg-transparent"
                >
                  Mark all read
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 animate-pulse mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const TypeIcon = typeIcons[notification.type]
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-slate-50 transition-colors ${
                          !notification.read_status ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${typeColors[notification.type]} flex items-center justify-center flex-shrink-0`}
                          >
                            <TypeIcon className={`h-4 w-4 ${typeTextColors[notification.type]}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-slate-800 leading-tight">
                                {notification.title}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-6 w-6 flex-shrink-0 hover:bg-red-100 bg-transparent"
                              >
                                <X className="h-3 w-3 text-slate-400" />
                              </Button>
                            </div>

                            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-400">
                                {formatDate(notification.created_at)}
                              </p>
                              {!notification.read_status && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 text-xs text-blue-600 hover:text-blue-700 bg-transparent"
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>
        </>
      )}
    </>
  )
}
