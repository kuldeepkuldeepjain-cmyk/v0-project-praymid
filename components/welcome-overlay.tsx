"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

import { CheckCircle, Phone, Plus, Loader2 } from "lucide-react"

interface WelcomeOverlayProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  referralCode: string
}

interface Contact {
  name: string
  phone: string
}

// Extend Navigator for Contacts API
declare global {
  interface Navigator {
    contacts?: {
      select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>
    }
  }
}

export function WelcomeOverlay({ isOpen, onClose, userId, referralCode }: WelcomeOverlayProps) {
  const [step, setStep] = useState<"welcome" | "instructions" | "contacts" | "success">("welcome")
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", phone: "" },
    { name: "", phone: "" },
    { name: "", phone: "" },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingDevice, setIsSyncingDevice] = useState(false)
  const [syncedCount, setSyncedCount] = useState(0)
  const { toast } = useToast()

  // Check if Web Contacts API is supported
  const isContactsApiSupported = typeof navigator !== "undefined" && "contacts" in navigator && navigator.contacts

  // Handle showing pre-instruction modal then opening contacts picker
  const handleDeviceSyncWithInstructions = () => {
    if (!isContactsApiSupported) {
      toast({
        title: "Not supported",
        description: "Contact sync is not supported on this browser. Please use Chrome on Android or add contacts manually.",
        variant: "destructive",
      })
      setStep("contacts")
      return
    }
    setStep("instructions")
  }

  // Open native contacts picker after instructions
  const openContactsPicker = async () => {
    setIsSyncingDevice(true)
    try {
      const props = ["name", "tel"]
      const opts = { multiple: true }
      const deviceContacts = await navigator.contacts!.select(props, opts)

      if (deviceContacts && deviceContacts.length > 0) {
        const formattedContacts = deviceContacts.map((contact) => ({
          name: contact.name?.[0] || "Unknown",
          phone: contact.tel?.[0] || "",
        }))
        setContacts(formattedContacts)
        setSyncedCount(formattedContacts.length)
        
        // Auto-submit after syncing from device
        await submitContacts(formattedContacts)
      } else {
        // User cancelled or selected nothing
        const retry = window.confirm("No contacts selected. Would you like to try again?")
        if (retry) {
          openContactsPicker()
        } else {
          setStep("contacts") // Fall back to manual entry
        }
      }
    } catch (error: unknown) {
      const err = error as Error
      if (err.name === "AbortError") {
        toast({
          title: "Sync cancelled",
          description: "You can sync anytime or add contacts manually",
        })
        setStep("contacts")
      } else if (err.name === "NotAllowedError") {
        toast({
          title: "Permission denied",
          description: "Please enable contacts access in your browser settings",
          variant: "destructive",
        })
        setStep("contacts")
      } else {
        toast({
          title: "Sync failed",
          description: "Please try again or add contacts manually",
          variant: "destructive",
        })
        setStep("contacts")
      }
    } finally {
      setIsSyncingDevice(false)
    }
  }

  // Legacy manual device sync
  const handleDeviceSync = async () => {
    if (!isContactsApiSupported) {
      toast({
        title: "Not supported",
        description: "Contact sync is not supported on this device. Please add contacts manually.",
        variant: "destructive",
      })
      return
    }

    setIsSyncingDevice(true)
    try {
      const props = ["name", "tel"]
      const opts = { multiple: true }
      const deviceContacts = await navigator.contacts!.select(props, opts)

      if (deviceContacts && deviceContacts.length > 0) {
        const formattedContacts = deviceContacts.map((contact) => ({
          name: contact.name?.[0] || "Unknown",
          phone: contact.tel?.[0] || "",
        }))
        setContacts(formattedContacts)
        toast({
          title: "Contacts loaded!",
          description: `${formattedContacts.length} contacts imported from your device`,
        })
      }
    } catch (error) {
      toast({
        title: "Sync cancelled",
        description: "You can still add contacts manually",
      })
    } finally {
      setIsSyncingDevice(false)
    }
  }

  const handleContactChange = (index: number, field: "name" | "phone", value: string) => {
    const newContacts = [...contacts]
    newContacts[index][field] = value
    setContacts(newContacts)
  }

  const addMoreContacts = () => {
    setContacts([...contacts, { name: "", phone: "" }])
  }

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index))
    }
  }

  // Shared function to submit contacts to database
  const submitContacts = async (contactsToSync: Contact[]) => {
    const validContacts = contactsToSync.filter((c) => c.name.trim() && c.phone.trim())

    if (validContacts.length === 0) {
      toast({
        title: "No contacts added",
        description: "Please add at least one contact to continue",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/participant/contact-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, contacts: validContacts }),
      })
      const result = await res.json()

      if (!result.success) throw new Error(result.error || "Sync failed")

      // Mark in localStorage
      localStorage.setItem("contactsSynced", "true")
      setSyncedCount(validContacts.length)
      setStep("success")

      toast({
        title: "Contacts synced successfully!",
        description: `${validContacts.length} contacts added. $5 bonus credited!`,
      })
    } catch (error) {
      toast({
        title: "Error syncing contacts",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSyncContacts = async () => {
    await submitContacts(contacts)
  }

  const handleSkip = () => {
    localStorage.setItem("contactsSynced", "skipped")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-[420px] bg-white rounded-3xl p-8 md:p-10 text-center"
        style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}
      >
        {step === "welcome" && (
          <>
            {/* Animated Emoji */}
            <div className="text-6xl mb-4 animate-pulse">🎉</div>

            {/* Main Heading */}
            <h1 className="text-2xl font-bold text-slate-800 mb-3">Welcome to FlowChain!</h1>

            {/* Gradient Subheading */}
            <p
              className="text-lg font-semibold mb-6"
              style={{
                background: "linear-gradient(135deg, #E85D3B, #7c3aed)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Unlock Your First $5 Bonus
            </p>

            {/* Phone Icon */}
            <div className="text-5xl mb-5">📱</div>

            {/* Description */}
            <p className="text-slate-500 text-[15px] leading-relaxed mb-6">
              Sync your contacts to find friends on FlowChain and earn $5 instantly!
            </p>

            {/* Benefits List */}
            <div className="text-left max-w-[300px] mx-auto mb-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 font-bold">✓</span>
                Find friends already here
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 font-bold">✓</span>
                Earn $5 welcome bonus
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 font-bold">✓</span>
                Get exclusive referral perks
              </div>
            </div>

            {/* Primary CTA Button */}
            <Button
              onClick={handleDeviceSyncWithInstructions}
              className="w-full h-14 text-base font-bold text-white border-none rounded-2xl mb-3 transition-all hover:brightness-110 active:translate-y-1"
              style={{
                background: "linear-gradient(135deg, #E85D3B, #fb8500)",
                boxShadow: "0 4px 0 #c74d2f, 0 8px 24px rgba(232, 93, 59, 0.4)",
              }}
            >
              Sync Contacts & Get $5
            </Button>

            {/* Skip Button */}
            <button onClick={handleSkip} className="text-slate-400 text-sm underline hover:text-slate-600 p-3">
              Skip for now
            </button>
          </>
        )}

        {step === "instructions" && (
          <>
            {/* Phone Icon */}
            <div className="text-6xl mb-4">📱</div>

            {/* Main Heading */}
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Almost There!</h2>

            <p className="text-slate-500 text-sm mb-6">Follow these simple steps:</p>

            {/* Instructions Card */}
            <div
              className="rounded-2xl p-5 mb-6 text-left"
              style={{
                background: "linear-gradient(135deg, rgba(232, 93, 59, 0.05), rgba(124, 58, 237, 0.05))",
                border: "2px solid #E85D3B",
              }}
            >
              {/* Step 1 */}
              <div className="flex items-center mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 flex-shrink-0"
                  style={{ background: "#E85D3B" }}
                >
                  1
                </div>
                <div className="text-[15px] font-semibold text-slate-800">
                  Allow permission when asked
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 flex-shrink-0"
                  style={{ background: "#7c3aed" }}
                >
                  2
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-slate-800 mb-1">
                    Tap <span className="bg-amber-100 px-2 py-0.5 rounded-md text-amber-800">"Select All"</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    (Top right corner of contacts list)
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 flex-shrink-0"
                  style={{ background: "#10b981" }}
                >
                  3
                </div>
                <div className="text-[15px] font-semibold text-slate-800">
                  Tap <span className="text-emerald-600">"Done"</span> ✓
                </div>
              </div>
            </div>

            {/* Time indicator */}
            <div className="bg-slate-100 rounded-xl p-3 mb-6 text-sm text-slate-600">
              ⚡ Takes only <strong>5 seconds</strong> to complete!
            </div>

            {/* Open Contacts Button */}
            <Button
              onClick={openContactsPicker}
              disabled={isSyncingDevice}
              className="w-full h-14 text-lg font-bold text-white border-none rounded-2xl mb-3 transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #E85D3B, #fb8500)",
                boxShadow: "0 4px 0 #c74d2f, 0 8px 24px rgba(232, 93, 59, 0.4)",
              }}
            >
              {isSyncingDevice ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Opening Contacts...
                </>
              ) : (
                "Open Contacts →"
              )}
            </Button>

            {/* Manual entry fallback */}
            <button
              onClick={() => setStep("contacts")}
              className="text-slate-400 text-sm underline hover:text-slate-600 p-2"
            >
              Add contacts manually instead
            </button>
          </>
        )}

        {step === "contacts" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-[#7c3aed]" />
              <h2 className="text-xl font-bold text-slate-800">Add Your Contacts</h2>
            </div>

            <p className="text-slate-500 text-sm mb-4">Add friends who might be interested in FlowChain</p>

            {/* Device Sync Button (for mobile) */}
            <Button
              onClick={handleDeviceSync}
              disabled={isSyncingDevice}
              variant="outline"
              className="w-full h-11 mb-4 border-2 border-dashed border-[#7c3aed]/30 text-[#7c3aed] hover:bg-purple-50 bg-transparent"
            >
              {isSyncingDevice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Import from Device
                </>
              )}
            </Button>

            {/* Contact List */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto mb-4 text-left">
              {contacts.map((contact, index) => (
                <div key={index} className="flex gap-2 p-3 bg-slate-50 rounded-xl relative">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Name</Label>
                    <Input
                      placeholder="Friend's name"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, "name", e.target.value)}
                      className="h-10 bg-white border-slate-200"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Phone</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, "phone", e.target.value)}
                      className="h-10 bg-white border-slate-200"
                    />
                  </div>
                  {contacts.length > 1 && (
                    <button
                      onClick={() => removeContact(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addMoreContacts}
                className="w-full h-10 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("welcome")}
                className="flex-1 h-12 border-slate-200 bg-transparent"
              >
                Back
              </Button>
              <Button
                onClick={handleSyncContacts}
                disabled={isSubmitting}
                className="flex-1 h-12 text-white font-bold"
                style={{
                  background: "linear-gradient(135deg, #E85D3B, #fb8500)",
                  boxShadow: "0 4px 0 #c74d2f, 0 8px 24px rgba(232, 93, 59, 0.4)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync & Get $5"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            {/* Celebration Emoji */}
            <div className="text-7xl mb-4 animate-bounce">🎉</div>

            {/* Success Heading */}
            <h2
              className="text-2xl font-bold mb-3"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Success!
            </h2>

            <p className="text-slate-500 mb-6">
              {syncedCount > 0 ? `${syncedCount} contacts synced successfully` : "Contacts synced successfully"}
            </p>

            {/* Bonus Card */}
            <div
              className="p-5 rounded-2xl mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))",
                border: "2px solid #10b981",
              }}
            >
              <div className="text-lg font-bold text-emerald-600 mb-2">+$5 Bonus Added! 💰</div>
              <p className="text-sm text-slate-500">Check your wallet balance</p>
            </div>

            <Button
              onClick={onClose}
              className="w-full h-14 text-lg font-bold text-white rounded-2xl border-none"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 4px 0 #047857, 0 8px 24px rgba(16, 185, 129, 0.4)",
              }}
            >
              Continue to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
