"use client"

import { useState, useEffect } from "react"
import { useTimezone } from "@/hooks/use-timezone"
import { COMMON_TIMEZONES, getClientTimezone } from "@/lib/datetime-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

interface TimezonesSelectorProps {
  onChange?: (timezone: string) => void
  showAutoDetect?: boolean
  showLabel?: boolean
}

export function TimezoneSelector({
  onChange,
  showAutoDetect = true,
  showLabel = true,
}: TimezonesSelectorProps) {
  const { timezone, setUserTimezone, isLoaded } = useTimezone()
  const [isOpen, setIsOpen] = useState(false)

  const handleChange = (newTimezone: string) => {
    setUserTimezone(newTimezone)
    onChange?.(newTimezone)
    setIsOpen(false)
  }

  const handleAutoDetect = () => {
    const detected = getClientTimezone()
    handleChange(detected)
  }

  if (!isLoaded) {
    return <div className="h-10 w-full bg-slate-100 rounded-md animate-pulse" />
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Timezone
        </Label>
      )}
      <div className="flex gap-2">
        <Select value={timezone} onValueChange={handleChange}>
          <SelectTrigger className="h-10 border-slate-200 hover:border-slate-300 focus:border-slate-400">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showAutoDetect && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDetect}
            className="border-slate-200 hover:bg-slate-50"
            title="Auto-detect your timezone"
          >
            Auto
          </Button>
        )}
      </div>
    </div>
  )
}
