"use client"

import { useState, type ComponentProps } from "react"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"

export function ParticipantAuthPassword(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <InputGroup className="min-w-0">
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon><LockKeyhole aria-hidden="true" /></InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-sm" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
