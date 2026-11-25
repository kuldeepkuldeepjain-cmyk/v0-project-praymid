import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getAccountBreach, type BreachAccount } from "@/lib/account-breach"

export function AccountBreachNotice({ account }: { account: BreachAccount }) {
  const breach = getAccountBreach(account)
  if (!breach) return null

  return (
    <Alert>
      <AlertTitle>Trading balance: $0.00 · Account breached</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">
          <p className="text-pretty text-sm leading-6">{breach.reason} Choose a funded plan, a challenge, or a normal account. Your new balance activates only after payment approval.</p>
          <nav aria-label="Account recovery options" className="flex flex-wrap gap-2">
            <Button asChild><Link href="/participant/dashboard/add-funds?mode=funded&tier=1">Buy Funded account</Link></Button>
            <Button variant="outline" asChild><Link href="/participant/dashboard/challenge#challenge-plans-heading">Buy Challenge account</Link></Button>
            <Button variant="outline" asChild><Link href="/participant/dashboard/add-funds?mode=actual">Start Normal account</Link></Button>
          </nav>
          <p className="text-sm leading-6">Already submitted a payment? Wait for its review before sending another. Separate admin restrictions still apply.</p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
