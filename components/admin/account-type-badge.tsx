import { Badge } from "@/components/ui/badge"

type AccountTypeBadgeProps = {
  accountType?: unknown
}

export function AccountTypeBadge({ accountType }: AccountTypeBadgeProps) {
  const rawType = typeof accountType === "string" ? accountType.trim() : accountType == null ? "" : String(accountType).trim()
  const normalizedType = rawType.toLowerCase().replace(/[\s_-]+/g, "")

  if (["funded", "fundedaccount", "fundedtier", "fundingtier"].includes(normalizedType)) {
    return <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Funded</Badge>
  }

  if (["challenge", "challengeaccount"].includes(normalizedType)) {
    return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">Challenge</Badge>
  }

  if (["normal", "standard", "regular", "normalaccount"].includes(normalizedType)) {
    return <Badge variant="outline" className="border-slate-600 bg-slate-800/60 text-slate-300">Normal</Badge>
  }

  const label = rawType
    ? rawType.replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "Unassigned"

  return <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground">{label}</Badge>
}
