"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User, Send, Loader2, Sparkles, X, ArrowUpRight, Trophy } from "lucide-react"

interface AIChatbotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIChatbotDialog({ open, onOpenChange }: AIChatbotDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Get user email from localStorage
  useEffect(() => {
    try {
      const participantData = localStorage.getItem("participantData")
      if (participantData) {
        const data = JSON.parse(participantData)
        setUserEmail(data.email || null)
      }
    } catch (error) {
      console.error("[v0] Error loading participant data:", error)
    }
  }, [open])

  const [input, setInput] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { messages, id, userEmail },
      }),
    }),
  })

  const isStreaming = status === "streaming" || status === "submitted"
  const isReady = status === "ready"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !isReady) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] sm:h-[600px] w-[95vw] sm:w-full flex flex-col p-0 gap-0 overflow-hidden border-0 shadow-xl sm:shadow-2xl">
        <DialogHeader className="p-3 pb-2 sm:p-4 sm:pb-3 md:p-6 md:pb-4 border-b bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 relative overflow-hidden">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer my-0" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg sm:shadow-2xl border border-white/30 animate-pulse-soft flex-shrink-0">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white drop-shadow-lg truncate">
                  FlowChain AI Assistant
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-white/90 hidden sm:block">
                  Ask me anything about the platform
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-lg sm:rounded-xl hover:bg-white/20 text-white transition-all hover:scale-110 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea
          ref={scrollRef}
          className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-cyan-50/30"
        >
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 sm:py-8 md:py-12 text-center animate-fade-in">
                <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-lg sm:shadow-2xl animate-float">
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mb-1 sm:mb-2 px-2">Welcome to FlowChain AI</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed px-3 sm:px-4">
                  I'm your intelligent assistant powered by advanced AI. Ask me about contributions, withdrawals, ranks,
                  or any other questions!
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4 md:mt-6 w-full max-w-md px-2">
                  {[
                    { text: "Check my balance", icon: <Trophy className="h-3 w-3" />, prompt: userEmail ? `Check my account balance and stats for ${userEmail}` : "How do I check my balance?" },
                    { text: "Platform stats", icon: <Sparkles className="h-3 w-3" />, prompt: "Show me current platform statistics" },
                    { text: "Top contributors", icon: <Trophy className="h-3 w-3" />, prompt: "Who are the top contributors on the leaderboard?" },
                    { text: "How predictions work", icon: <ArrowUpRight className="h-3 w-3" />, prompt: "How does prediction trading work?" },
                  ].map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-cyan-50 border-slate-200 hover:border-purple-300 transition-all hover:scale-105 h-8 sm:h-9 px-2 sm:px-3"
                      onClick={() => {
                        sendMessage({ text: item.prompt })
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <span className="hidden sm:inline">{item.icon}</span>
                        <span className="truncate">{item.text}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-2.5 md:gap-3 animate-fade-in-up ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Avatar
                  className={`h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 shadow-md sm:shadow-lg flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-slate-500 to-slate-700"
                      : "bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 animate-pulse-soft"
                  }`}
                >
                  <AvatarFallback className="text-white">
                    {message.role === "user" ? <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> : <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex-1 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 shadow-sm sm:shadow-md bg-[rgba(124,126,120,1)] ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-[#E85D3B] to-orange-500 text-white ml-4 sm:ml-8 md:ml-12"
                      : "bg-white text-slate-900 mr-4 sm:mr-8 md:mr-12 border border-slate-100"
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {message.parts
                      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
                      .map((p) => p.text)
                      .join("") || ""}
                  </p>
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-2 sm:gap-2.5 md:gap-3 animate-fade-in">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 shadow-md sm:shadow-lg animate-pulse-soft flex-shrink-0">
                  <AvatarFallback className="text-white">
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white mr-4 sm:mr-8 md:mr-12 border border-slate-100 shadow-sm sm:shadow-md">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-purple-600" />
                    <span className="text-xs sm:text-sm text-slate-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 sm:p-3 md:p-4 border-t bg-white shadow-md sm:shadow-lg">
          <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={!isReady}
              className="flex-1 bg-slate-50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 h-9 sm:h-10 md:h-11 text-xs sm:text-sm"
            />
            <Button
              type="submit"
              disabled={!isReady || !input.trim()}
              className="bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 hover:from-purple-700 hover:via-pink-600 hover:to-cyan-600 text-white shadow-md sm:shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-6"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </form>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 text-center hidden sm:block">Powered by advanced AI • Responses may vary</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
