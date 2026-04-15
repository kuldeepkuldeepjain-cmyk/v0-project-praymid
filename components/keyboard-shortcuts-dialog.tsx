"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ShortcutItem = {
  keys: string[]
  description: string
}

const shortcuts: ShortcutItem[] = [
  { keys: ["R"], description: "Refresh data" },
  { keys: ["S"], description: "Focus search" },
  { keys: ["E"], description: "Export to CSV" },
  { keys: ["?"], description: "Show shortcuts" },
  { keys: ["Esc"], description: "Close modals" },
  { keys: ["1"], description: "All networks" },
  { keys: ["2"], description: "BSC only" },
  { keys: ["3"], description: "ETH only" },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Use these shortcuts to navigate the dashboard faster</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd key={keyIndex} className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
