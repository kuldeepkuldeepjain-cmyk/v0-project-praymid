"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ExternalLink,
  Copy,
  Mail,
  Phone,
  User,
  Wallet,
  Calendar,
  Clock,
  Globe,
  Home,
  Hash,
  Shield,
  Activity,
  DollarSign,
} from "lucide-react"
import type { ParticipantProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

type ParticipantWithActivity = ParticipantProfile & {
  participantNumber?: number
  email?: string
  name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  password?: string
  role?: string
  status?: string
  totalGiven: number
  totalReceived: number
  pendingRequests: number
  completedTransactions: number
  wallet_balance?: number
  contributed_amount?: number
  recentTransactions?: Array<{
    id: string
    type: "given" | "received"
    amount: number
    chain: "BSC" | "ETH"
    tx_hash?: string
    created_at: string
  }>
}

type ParticipantModalProps = {
  participant: ParticipantWithActivity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ParticipantModal({ participant, open, onOpenChange }: ParticipantModalProps) {
  const { toast } = useToast()

  if (!participant) return null

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 text-slate-900 bg-[rgba(197,164,164,1)]">
        <DialogHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <User className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-slate-900">
                {participant.name || "Unknown User"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {participant.participantNumber && (
                  <Badge className="font-mono bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200">
                    <Hash className="h-3 w-3 mr-1" />
                    {participant.participantNumber}
                  </Badge>
                )}
                <Badge
                  className={`capitalize ${participant.role === "admin" ? "bg-violet-500 text-white" : "bg-violet-100 text-violet-700 border-violet-200"}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {participant.role || "participant"}
                </Badge>
                <Badge
                  className={
                    participant.status === "active"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }
                >
                  <Activity className="h-3 w-3 mr-1" />
                  {participant.status || "active"}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="p-4 text-center">
                <Wallet className="h-5 w-5 text-violet-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-violet-700">${(participant.wallet_balance || 0).toFixed(2)}</p>
                <p className="text-xs text-violet-600">Wallet Balance</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-700">
                  ${(participant.contributed_amount || 0).toFixed(2)}
                </p>
                <p className="text-xs text-emerald-600">Contributed</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">{participant.pendingRequests}</p>
                <p className="text-xs text-amber-600">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-cyan-50 border-cyan-200">
              <CardContent className="p-4 text-center">
                <Activity className="h-5 w-5 text-cyan-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-cyan-700">{participant.completedTransactions}</p>
                <p className="text-xs text-cyan-600">Completed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200 bg-[rgba(170,187,202,1)]">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
                    <Mail className="h-4 w-4 text-violet-600" />
                    <span className="text-sm text-slate-700 flex-1 truncate">
                      {participant.email || "Not provided"}
                    </span>
                    {participant.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-violet-100 text-violet-600"
                        onClick={() => copyToClipboard(participant.email!, "Email")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
                    <Phone className="h-4 w-4 text-violet-600" />
                    <span className="text-sm text-slate-700">{participant.phone || "Not provided"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-[rgba(169,186,201,1)]">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Login Credentials
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Email</span>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
                      <code className="text-sm text-violet-600 flex-1 font-mono truncate">
                        {participant.email || "—"}
                      </code>
                      {participant.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-violet-100 text-violet-600"
                          onClick={() => copyToClipboard(participant.email!, "Email")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Password</span>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
                      <code className="text-sm text-violet-600 flex-1 font-mono">{participant.password || "—"}</code>
                      {participant.password && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-violet-100 text-violet-600"
                          onClick={() => copyToClipboard(participant.password!, "Password")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-[rgba(169,186,201,1)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-4 w-4 text-violet-600" />
                <h4 className="bg-white rounded-lg p-3 border border-slate-200">Full Address</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Street Address</span>
                  <p className="text-sm text-slate-700">{participant.address || "Not provided"}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">City</span>
                  <p className="text-sm text-slate-700">{participant.city || "Not provided"}</p>
                </div>
                <div className="rounded-lg p-3 border border-slate-200 bg-[rgba(252,251,251,1)]">
                  <span className="text-xs text-slate-500 block mb-1">State/Province</span>
                  <p className="text-sm text-slate-700">{participant.state || "Not provided"}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Country</span>
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-violet-600" />
                    <p className="text-sm font-medium text-violet-600">{participant.country || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-[rgba(169,186,201,1)]">
            <CardContent className="p-4 bg-[rgba(169,186,201,1)]">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-violet-600" />
                <h4 className="text-sm font-semibold text-slate-700">Wallet Address</h4>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-slate-200">
                <code className="text-sm font-mono flex-1 break-all text-black font-bold">{participant.wallet_address}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 hover:bg-violet-100 text-violet-600"
                  onClick={() => copyToClipboard(participant.wallet_address, "Wallet address")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 hover:bg-violet-100 text-violet-600"
                  asChild
                >
                  <a
                    href={`https://bscscan.com/address/${participant.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4 text-violet-600" />
              <span className="text-black">Joined {new Date(participant.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4 text-violet-600" />
              <span className="text-black">Last active {new Date(participant.last_active).toLocaleDateString()}</span>
            </div>
          </div>

          {participant.recentTransactions && participant.recentTransactions.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-600" />
                Recent Transactions
              </h4>
              <div className="space-y-2">
                {participant.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          tx.type === "given"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 capitalize"
                            : "bg-cyan-100 text-cyan-700 border-cyan-200 capitalize"
                        }
                      >
                        {tx.type}
                      </Badge>
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200">{tx.chain}</Badge>
                      <span className="font-semibold text-slate-900">${tx.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</span>
                      {tx.tx_hash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-violet-100 text-violet-600"
                          asChild
                        >
                          <a
                            href={`${tx.chain === "BSC" ? "https://bscscan.com" : "https://etherscan.io"}/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
