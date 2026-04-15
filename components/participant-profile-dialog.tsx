"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { User, Phone, MapPin, Briefcase, Save } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ParticipantProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantData: {
    email?: string
    name?: string
    username?: string
    phone?: string
    date_of_birth?: string
    gender?: string
    occupation?: string
    monthly_income?: string
    address?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
  }
}

export function ParticipantProfileDialog({ open, onOpenChange, participantData }: ParticipantProfileDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: participantData.name || "",
    phone: participantData.phone || "",
    date_of_birth: participantData.date_of_birth || "",
    gender: participantData.gender || "",
    occupation: participantData.occupation || "",
    monthly_income: participantData.monthly_income || "",
    address: participantData.address || "",
    city: participantData.city || "",
    state: participantData.state || "",
    country: participantData.country || "United States",
    postal_code: participantData.postal_code || "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData({
      name: participantData.name || "",
      phone: participantData.phone || "",
      date_of_birth: participantData.date_of_birth || "",
      gender: participantData.gender || "",
      occupation: participantData.occupation || "",
      monthly_income: participantData.monthly_income || "",
      address: participantData.address || "",
      city: participantData.city || "",
      state: participantData.state || "",
      country: participantData.country || "United States",
      postal_code: participantData.postal_code || "",
    })
  }, [participantData])

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Profile Updated",
      description: "Your personal details have been saved successfully",
    })
    setIsSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-violet-600" />
            Personal Profile
          </DialogTitle>
          <DialogDescription className="text-slate-500">Complete your profile to unlock all features</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name" className="text-slate-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="dob" className="text-slate-700">
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-slate-700">
                  Gender
                </Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="input-field-light mt-1.5">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={participantData.email}
                  disabled
                  className="input-field-light mt-1.5 bg-slate-50"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="phone" className="text-slate-700">
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="input-field-light mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professional Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation" className="text-slate-700">
                  Occupation
                </Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Software Engineer"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="income" className="text-slate-700">
                  Monthly Income
                </Label>
                <Select
                  value={formData.monthly_income}
                  onValueChange={(value) => setFormData({ ...formData, monthly_income: value })}
                >
                  <SelectTrigger className="input-field-light mt-1.5">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="0-1000">$0 - $1,000</SelectItem>
                    <SelectItem value="1000-3000">$1,000 - $3,000</SelectItem>
                    <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                    <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                    <SelectItem value="10000+">$10,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="address" className="text-slate-700">
                  Street Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-slate-700">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-slate-700">
                  State/Province
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-slate-700">
                  Country
                </Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United States"
                  className="input-field-light mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="postal" className="text-slate-700">
                  Postal Code
                </Label>
                <Input
                  id="postal"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="10001"
                  className="input-field-light mt-1.5"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-300 text-slate-700">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="btn-primary-light shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
