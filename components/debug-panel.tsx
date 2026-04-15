"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

type DebugLog = {
  timestamp: string
  type: "error" | "warning" | "info"
  message: string
}

type DebugPanelProps = {
  logs: DebugLog[]
  onClear: () => void
}

export function DebugPanel({ logs, onClear }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (logs.length === 0) return null

  return (
    <Card className="border-yellow-500/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm font-medium">Debug Panel ({logs.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClear}>
                Clear
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs font-mono ${
                    log.type === "error"
                      ? "bg-red-500/10 text-red-500"
                      : log.type === "warning"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
