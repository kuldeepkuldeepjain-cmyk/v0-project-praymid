"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Bell, Send, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SendNotificationPanel() {
  const [recipientType, setRecipientType] = useState<"all" | "single">("all")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notificationType, setNotificationType] = useState<"info" | "success" | "warning" | "error">("info")
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  const handleSendNotification = async () => {
    if (!title || !message) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and message",
        variant: "destructive",
      })
      return
    }

    if (recipientType === "single" && !recipientEmail) {
      toast({
        title: "Validation Error",
        description: "Please provide recipient email",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientType, recipientEmail, title, message, type: notificationType }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast({
        title: "Success",
        description: recipientType === "all"
          ? `Notification sent to ${data.count} users`
          : `Notification sent to ${recipientEmail}`,
      })
      setTitle("")
      setMessage("")
      setRecipientEmail("")
      setRecipientType("all")
      setNotificationType("info")
    } catch (error) {
      console.error("Error sending notification:", error)
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const typeIcons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  }

  const typeColors = {
    info: "bg-blue-100 text-blue-700 border-blue-300",
    success: "bg-green-100 text-green-700 border-green-300",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-300",
    error: "bg-red-100 text-red-700 border-red-300",
  }

  const TypeIcon = typeIcons[notificationType]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Send Notification</h2>
        <p className="text-slate-600 mt-1">Send messages and notifications to users</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>Create and send notifications to your users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Type */}
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType(v as "all" | "single")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="single">Single User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Email (if single) */}
            {recipientType === "single" && (
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            )}

            {/* Notification Type */}
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select value={notificationType} onValueChange={(v) => setNotificationType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-slate-500">{title.length}/100 characters</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
                maxLength={500}
              />
              <p className="text-xs text-slate-500">{message.length}/500 characters</p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendNotification}
              disabled={isSending || !title || !message}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Send Notification"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>How users will see this notification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${typeColors[notificationType]}`}>
                <div className="flex items-start gap-3">
                  <TypeIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">
                      {title || "Notification Title"}
                    </p>
                    <p className="text-xs leading-relaxed">
                      {message || "Your notification message will appear here..."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Recipients:</span>
                  <Badge variant="outline">
                    {recipientType === "all" ? "All Users" : recipientEmail || "Single User"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Type:</span>
                  <Badge className={typeColors[notificationType]}>
                    {notificationType}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
