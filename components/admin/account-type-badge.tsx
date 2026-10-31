import { Badge } from "@/components/ui/badge"

type AccountTypeBadgeProps = {
  accountType?: unknown
  appearance?: "dark" | "light"
}

export function AccountTypeBadge({ accountType, appearance = "dark" }: AccountTypeBadgeProps) {
  const rawType = typeof accountType === "string" ? accountType.trim() : accountType == null ? "" : String(accountType).trim()
  const normalizedType = rawType.toLowerCase().replace(/[\s_-]+/g, "")
  const tones = appearance === "light"
    ? {
        funded: "border-cyan-200 bg-cyan-50 text-cyan-800",
        challenge: "border-amber-200 bg-amber-50 text-amber-800",
        normal: "border-slate-300 bg-slate-100 text-slate-700",
      }
    : {
        funded: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
        challenge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        normal: "border-slate-600 bg-slate-800/60 text-slate-300",
      }

  if (["funded", "fundedaccount", "fundedtier", "fundingtier"].includes(normalizedType)) {
    return <Badge variant="outline" className={tones.funded}>Funded</Badge>
  }

  if (["challenge", "challengeaccount"].includes(normalizedType)) {
    return <Badge variant="outline" className={tones.challenge}>Challenge</Badge>
  }

  if (["normal", "standard", "regular", "normalaccount"].includes(normalizedType)) {
    return <Badge variant="outline" className={tones.normal}>Normal</Badge>
  }

  const label = rawType
    ? rawType.replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "Unassigned"

  return <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground">{label}</Badge>
}
