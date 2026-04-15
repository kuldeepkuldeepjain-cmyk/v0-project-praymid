"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, Shield, Eye, CheckCircle2 } from "lucide-react"
import type { RiskFlag } from "@/lib/types"

interface RiskEnginePanelProps {
  flags?: Array<{
    id: string
    participantId: string
    participantEmail: string
    participantName: string
    flags: RiskFlag[]
    riskScore: number
  }>
  onResolveFlag?: (flagId: string, participantId: string) => void
  onViewParticipant?: (participantId: string) => void
}

export function RiskEnginePanel({ flags = [], onResolveFlag, onViewParticipant }: RiskEnginePanelProps) {
  const safeFlags = flags || []

  const getSeverityColor = (severity: RiskFlag["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/30"
      case "medium":
        return "bg-warning/10 text-warning border-warning/30"
      case "low":
        return "bg-muted text-muted-foreground border-border"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getFlagIcon = (type: RiskFlag["type"]) => {
    switch (type) {
      case "fast_join":
        return Clock
      case "duplicate_ip":
      case "duplicate_wallet":
        return AlertTriangle
      case "suspicious_screenshot":
        return Eye
      default:
        return AlertTriangle
    }
  }

  const getFlagLabel = (type: RiskFlag["type"]) => {
    switch (type) {
      case "fast_join":
        return "Rapid Registration"
      case "duplicate_ip":
        return "Duplicate IP"
      case "duplicate_wallet":
        return "Duplicate Wallet"
      case "suspicious_screenshot":
        return "Suspicious Screenshot"
      default:
        return "Unknown Flag"
    }
  }

  const activeFlagsCount = safeFlags.filter((f) => f.flags?.some((fl) => !fl.resolved)).length

  return (
    <div className="space-y-4">
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-warning" />
                Risk Engine
              </CardTitle>
              <CardDescription>Automated risk detection and flagging</CardDescription>
            </div>
            <Badge variant="outline" className="text-warning border-warning/30">
              {activeFlagsCount} Active Flags
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {safeFlags.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
              <p className="text-muted-foreground">No risk flags detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {safeFlags.map((participant) => (
                <div
                  key={participant.id}
                  className="p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{participant.participantName || participant.participantEmail}</p>
                      <p className="text-sm text-muted-foreground">{participant.participantEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          participant.riskScore >= 70
                            ? "border-destructive/30 text-destructive"
                            : participant.riskScore >= 40
                              ? "border-warning/30 text-warning"
                              : "border-border"
                        }
                      >
                        Risk: {participant.riskScore}
                      </Badge>
                      {onViewParticipant && (
                        <Button variant="ghost" size="sm" onClick={() => onViewParticipant(participant.participantId)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(participant.flags || [])
                      .filter((f) => !f.resolved)
                      .map((flag) => {
                        const Icon = getFlagIcon(flag.type)
                        return (
                          <div
                            key={flag.id}
                            className={`flex items-center justify-between p-2 rounded-md border ${getSeverityColor(flag.severity)}`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{getFlagLabel(flag.type)}</span>
                              <span className="text-xs opacity-75">{flag.description}</span>
                            </div>
                            {onResolveFlag && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onResolveFlag(flag.id, participant.participantId)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
