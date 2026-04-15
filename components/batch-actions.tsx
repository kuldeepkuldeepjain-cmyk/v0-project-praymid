"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import type { Payment } from "@/lib/types"

type BatchActionsProps = {
  selectedPayments: string[]
  payments: Payment[]
  onSelectAll: () => void
  onDeselectAll: () => void
  onBatchCollect: () => void
}

export function BatchActions({
  selectedPayments,
  payments,
  onSelectAll,
  onDeselectAll,
  onBatchCollect,
}: BatchActionsProps) {
  const collectableCount = payments.filter((p) => selectedPayments.includes(p.id) && p.status === "approved").length

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <Checkbox
        checked={selectedPayments.length === payments.length && payments.length > 0}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelectAll()
          } else {
            onDeselectAll()
          }
        }}
      />
      <span className="text-sm font-medium">{selectedPayments.length} selected</span>
      {selectedPayments.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Batch Actions
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onBatchCollect} disabled={collectableCount === 0}>
              Collect Selected ({collectableCount})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeselectAll}>Deselect All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
