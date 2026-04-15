"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Radio, Send, Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function GlobalBroadcastPanel() {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleBroadcast = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to broadcast",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })

      if (!response.ok) throw new Error("Failed to send broadcast")

      toast({
        title: "Broadcast Sent",
        description: "Your message has been sent to all users",
      })
      setMessage("")
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Could not send broadcast message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="glass rounded-2xl border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-500/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-gray-900">Global Broadcast</CardTitle>
            <CardDescription className="text-gray-500">
              Send a message to all users in real-time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="broadcast-message" className="text-gray-700 font-semibold">
            Message
          </Label>
          <Textarea
            id="broadcast-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement here... This will appear in all users' notification bars."
            className="min-h-[120px] bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl resize-none"
          />
          <p className="text-xs text-gray-500">
            {message.length}/500 characters
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Message will be sent to all active participants</span>
          </div>
        </div>

        <Button
          onClick={handleBroadcast}
          disabled={isSending || !message.trim()}
          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300"
        >
          {isSending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sending Broadcast...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Send Broadcast
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
