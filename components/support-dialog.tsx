"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Send } from "lucide-react"

interface SupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantEmail: string
}

export function SupportDialog({ open, onOpenChange, participantEmail }: SupportDialogProps) {
  const { toast } = useToast()
  const [category, setCategory] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantEmail,
          category,
          subject,
          message,
        }),
      })

      if (!response.ok) throw new Error("Failed to submit ticket")

      toast({
        title: "Ticket Submitted",
        description: "Our support team will respond within 24 hours",
      })

      setCategory("")
      setSubject("")
      setMessage("")
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-violet-600" />
            Contact Support
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Describe your issue and our team will assist you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="category" className="text-slate-700">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="input-field-light mt-1.5">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="payment">Payment/Contribution</SelectItem>
                <SelectItem value="account">Account Access</SelectItem>
                <SelectItem value="general">General Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject" className="text-slate-700">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="input-field-light mt-1.5"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="message" className="text-slate-700">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide detailed information about your problem..."
              className="input-field-light mt-1.5 min-h-[150px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-slate-400 mt-1">{message.length}/500 characters</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-300 text-slate-700">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary-light shadow-lg">
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
