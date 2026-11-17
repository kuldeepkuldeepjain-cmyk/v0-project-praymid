"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  CircleDollarSign,
  Crosshair,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  User,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { COACH_MODELS, COACH_MODES, COACH_TIMEFRAMES, type CoachLaunch, type CoachMode } from "@/lib/trade-coach"

interface AIChatbotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  launch?: CoachLaunch | null
}

const chatTransport = new DefaultChatTransport({ api: "/api/chat" })
const instruments = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "XAU/USD"] as const

const quickActions = [
  {
    label: "Account snapshot",
    description: "Balance, limits, and exposure",
    prompt: "Review my current account balance, account status, open exposure, and any risk warnings. Use verified account data only.",
    icon: CircleDollarSign,
  },
  {
    label: "Market brief",
    description: "Price, trend, and data quality",
    prompt: "Give me a current market brief for the selected instrument and timeframe. Separate verified observations from scenarios.",
    icon: BarChart3,
  },
  {
    label: "Trade plan",
    description: "Thesis through invalidation",
    prompt: "Guide me through a disciplined conditional trade plan for the selected market. Ask for any missing entry, stop, target, direction, or risk budget before doing position-size math.",
    icon: Crosshair,
  },
  {
    label: "Risk check",
    description: "Stops, sizing, and concentration",
    prompt: "Review my open positions and give me a prioritized pre-trade risk checklist, including missing stops, sizing, liquidity, and no-trade conditions.",
    icon: ShieldCheck,
  },
  {
    label: "Performance review",
    description: "Evidence-based improvements",
    prompt: "Review my recorded trading performance, state the sample size, and suggest three evidence-based process improvements.",
    icon: Trophy,
  },
  {
    label: "Platform overview",
    description: "Current participation statistics",
    prompt: "Show me the current non-sensitive EliteFund platform statistics and clearly label when they were observed.",
    icon: Activity,
  },
] as const

type SelectOption = { value: string; label: string }

function CoachSelect({ label, value, options, onValueChange }: { label: string; value: string; options: readonly SelectOption[]; onValueChange: (value: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--terminal-graphite-muted)]">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)] px-3 text-sm font-medium text-[var(--terminal-graphite-text)] shadow-none focus-visible:border-[var(--brand-primary)] focus-visible:ring-[var(--brand-primary)]/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)] text-[var(--terminal-graphite-text)]">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="focus:bg-[color-mix(in_srgb,var(--brand-primary)_14%,var(--terminal-graphite-surface-2))] focus:text-[var(--terminal-graphite-text)]">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
}

export function AIChatbotDialog({ open, onOpenChange, launch }: AIChatbotDialogProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [model, setModel] = useState<string>(COACH_MODELS[0].id)
  const [mode, setMode] = useState<CoachMode>(launch?.mode ?? "market")
  const [pair, setPair] = useState(launch?.pair ?? "EUR/USD")
  const [timeframe, setTimeframe] = useState(launch?.timeframe ?? "1H")
  const { messages, sendMessage, status, error, regenerate, stop, setMessages, clearError } = useChat({ transport: chatTransport })

  const selectedMode = COACH_MODES.find((item) => item.id === mode) ?? COACH_MODES[0]
  const selectedModel = COACH_MODELS.find((item) => item.id === model) ?? COACH_MODELS[0]
  const isStreaming = status === "streaming" || status === "submitted"
  const isReady = status === "ready"
  const requestContext = { model, mode, pair, timeframe }

  useEffect(() => {
    const viewport = scrollRootRef.current?.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']")
    if (!viewport) return
    const frame = requestAnimationFrame(() => viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" }))
    return () => cancelAnimationFrame(frame)
  }, [messages, status])

  const sendPrompt = (text: string) => {
    const prompt = text.trim()
    if (!prompt || !isReady) return
    void sendMessage({ text: prompt }, { body: requestContext })
    setInput("")
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendPrompt(input)
  }

  const clearConversation = () => {
    if (isStreaming) stop()
    setMessages([])
    setInput("")
    clearError()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby="elitefund-ai-description"
        className="flex h-[calc(100dvh-1rem)] max-h-[760px] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border border-[var(--terminal-graphite-border)] p-0 text-[var(--terminal-graphite-text)] shadow-2xl sm:h-[min(720px,calc(100dvh-2rem))]"
        style={{
          background: "var(--terminal-graphite-bg)",
          boxShadow: "0 32px 90px rgba(0, 0, 0, 0.58), 0 0 0 1px color-mix(in srgb, var(--brand-primary) 12%, transparent)",
        }}
      >
        <DialogHeader className="relative flex flex-row items-center justify-between gap-3 overflow-hidden border-b border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] px-4 py-4 text-left sm:px-5">
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-48 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
          <div className="relative flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_12%,var(--terminal-graphite-surface-2))] text-[var(--brand-primary)] shadow-[0_0_28px_color-mix(in_srgb,var(--brand-primary)_18%,transparent)]">
              <Bot aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-base font-semibold tracking-tight text-[var(--terminal-graphite-text)] sm:text-lg">EliteFund AI Assistant</DialogTitle>
                <Badge variant="outline" className="h-5 gap-1.5 border-[color-mix(in_srgb,var(--brand-primary)_38%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] px-2 text-[10px] font-semibold text-[var(--brand-primary)]">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                  Online
                </Badge>
              </div>
              <DialogDescription id="elitefund-ai-description" className="mt-1 truncate text-xs text-[var(--terminal-graphite-muted)]">
                {selectedMode.label} · {pair} · {timeframe} · {selectedModel.label}
              </DialogDescription>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={clearConversation} aria-label="Start a new conversation" title="New conversation" className="rounded-lg text-[var(--terminal-graphite-muted)] hover:bg-[var(--terminal-graphite-surface-2)] hover:text-[var(--terminal-graphite-text)]">
                <Trash2 aria-hidden="true" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close AI assistant" className="rounded-lg text-[var(--terminal-graphite-muted)] hover:bg-[var(--terminal-graphite-surface-2)] hover:text-[var(--terminal-graphite-text)]">
              <X aria-hidden="true" />
            </Button>
          </div>
        </DialogHeader>

        <section aria-label="Assistant context" className="grid grid-cols-2 gap-2.5 border-b border-[var(--terminal-graphite-border)] bg-[color-mix(in_srgb,var(--terminal-graphite-surface)_86%,var(--terminal-graphite-bg))] px-3 py-3 sm:grid-cols-4 sm:px-5">
          <CoachSelect label="Workflow" value={mode} onValueChange={(value) => setMode(value as CoachMode)} options={COACH_MODES.map((item) => ({ value: item.id, label: item.label }))} />
          <CoachSelect label="Instrument" value={pair} onValueChange={setPair} options={instruments.map((item) => ({ value: item, label: item }))} />
          <CoachSelect label="Timeframe" value={timeframe} onValueChange={setTimeframe} options={COACH_TIMEFRAMES.map((item) => ({ value: item, label: item }))} />
          <CoachSelect label="Model" value={model} onValueChange={setModel} options={COACH_MODELS.map((item) => ({ value: item.id, label: item.label }))} />
        </section>

        <ScrollArea ref={scrollRootRef} className="min-h-0 flex-1 bg-[var(--terminal-graphite-bg)]">
          <div className="flex min-h-full flex-col px-3 py-4 sm:px-5 sm:py-5">
            {messages.length === 0 ? (
              <Empty className="my-auto gap-5 border-0 p-0 sm:gap-6">
                <EmptyHeader className="max-w-lg gap-2.5">
                  <EmptyMedia variant="icon" className="size-14 rounded-2xl border border-[color-mix(in_srgb,var(--brand-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_13%,var(--terminal-graphite-surface))] text-[var(--brand-primary)] shadow-[0_0_40px_color-mix(in_srgb,var(--brand-primary)_17%,transparent)] [&_svg]:size-7">
                    <Sparkles aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl font-semibold text-[var(--terminal-graphite-text)] sm:text-2xl">Your trading decision copilot</EmptyTitle>
                  <EmptyDescription className="max-w-md text-xs leading-5 text-[var(--terminal-graphite-muted)] sm:text-sm sm:leading-6">
                    Explore verified account context, market observations, risk controls, and disciplined planning. EliteFund AI cannot place or modify trades.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                  {quickActions.map(({ label, description, prompt, icon: Icon }) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      disabled={!isReady}
                      onClick={() => sendPrompt(prompt)}
                      className="group h-auto min-w-0 items-start justify-start whitespace-normal rounded-xl border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] px-3 py-3 text-left text-[var(--terminal-graphite-text)] shadow-none hover:border-[color-mix(in_srgb,var(--brand-primary)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,var(--terminal-graphite-surface))] hover:text-[var(--terminal-graphite-text)]"
                    >
                      <Icon data-icon="inline-start" className="mt-0.5 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold sm:text-sm">{label}</span>
                        <span className="mt-0.5 hidden text-[10px] font-normal leading-4 text-[var(--terminal-graphite-muted)] sm:block">{description}</span>
                      </span>
                    </Button>
                  ))}
                </EmptyContent>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4" aria-live="polite">
                {messages.map((message) => {
                  const isUser = message.role === "user"
                  const text = getMessageText(message)
                  if (!text) return null
                  return (
                    <article key={message.id} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      <Avatar className="size-8 shrink-0 border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)]">
                        <AvatarFallback className={isUser ? "bg-[var(--terminal-graphite-surface-2)] text-[var(--terminal-graphite-muted)]" : "bg-[color-mix(in_srgb,var(--brand-primary)_13%,var(--terminal-graphite-surface-2))] text-[var(--brand-primary)]"}>
                          {isUser ? <User aria-hidden="true" /> : <Bot aria-hidden="true" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[84%] rounded-2xl px-3.5 py-3 sm:max-w-[78%] sm:px-4 ${isUser ? "rounded-br-md bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "rounded-bl-md border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] text-[var(--terminal-graphite-text)]"}`}>
                        <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-[color-mix(in_srgb,var(--brand-primary-foreground)_70%,transparent)]" : "text-[var(--brand-primary)]"}`}>{isUser ? "You" : "EliteFund AI"}</p>
                        <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>
                      </div>
                    </article>
                  )
                })}

                {isStreaming && (
                  <div className="flex items-end gap-2.5" role="status" aria-label="EliteFund AI is analyzing">
                    <Avatar className="size-8 border border-[var(--terminal-graphite-border)]">
                      <AvatarFallback className="bg-[color-mix(in_srgb,var(--brand-primary)_13%,var(--terminal-graphite-surface-2))] text-[var(--brand-primary)]">
                        <Bot aria-hidden="true" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] px-4 py-3 text-sm text-[var(--terminal-graphite-muted)]">
                      <Spinner className="text-[var(--brand-primary)]" />
                      Analyzing verified context…
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4 border-red-400/25 bg-red-500/10 text-red-100">
                <RotateCcw aria-hidden="true" />
                <AlertTitle>Response interrupted</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-red-100/75">
                  EliteFund AI could not complete that request.
                  <Button type="button" variant="outline" size="sm" onClick={() => void regenerate({ body: requestContext })} className="border-red-300/25 bg-transparent text-red-100 hover:bg-red-400/10 hover:text-red-50">Retry</Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <footer className="border-t border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] p-3 sm:p-4">
          <form onSubmit={handleSubmit}>
            <InputGroup className="h-12 rounded-xl border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)] shadow-[inset_0_1px_rgba(255,255,255,0.025)] has-[[data-slot=input-group-control]:focus-visible]:border-[var(--brand-primary)] has-[[data-slot=input-group-control]:focus-visible]:ring-[var(--brand-primary)]/20">
              <InputGroupInput
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label="Message EliteFund AI"
                placeholder={isStreaming ? "EliteFund AI is analyzing…" : "Ask about markets, risk, or your account…"}
                disabled={!isReady}
                autoComplete="off"
                className="h-11 px-3 text-sm text-[var(--terminal-graphite-text)] placeholder:text-[var(--terminal-graphite-muted)]/75"
              />
              <InputGroupAddon align="inline-end" className="pr-1.5">
                {isStreaming ? (
                  <InputGroupButton type="button" size="icon-sm" variant="ghost" onClick={stop} aria-label="Stop response" className="rounded-lg bg-[var(--terminal-graphite-elevated)] text-[var(--terminal-graphite-text)] hover:bg-[var(--terminal-graphite-border)]">
                    <Square aria-hidden="true" />
                  </InputGroupButton>
                ) : (
                  <InputGroupButton type="submit" size="icon-sm" disabled={!isReady || !input.trim()} aria-label="Send message" className="rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:bg-[var(--brand-primary)] hover:brightness-110">
                    <Send aria-hidden="true" />
                  </InputGroupButton>
                )}
              </InputGroupAddon>
            </InputGroup>
          </form>
          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-[var(--terminal-graphite-muted)] sm:text-xs">
            <span>Educational decision support, not financial advice.</span>
            <span className="hidden items-center gap-1 font-medium text-[var(--brand-primary)] sm:flex">
              Data quality labeled
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </span>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
