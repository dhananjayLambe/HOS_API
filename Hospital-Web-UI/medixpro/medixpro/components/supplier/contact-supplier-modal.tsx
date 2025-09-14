"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Mail, Phone, User } from "lucide-react"

interface ContactSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: {
    id: string
    name: string
    contact?: string
    email?: string
    contactPerson?: string
    phone?: string
  } | null
}

export function ContactSupplierModal({ isOpen, onClose, supplier }: ContactSupplierModalProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [contactMethod, setContactMethod] = useState("email")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!supplier) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${supplier.name}.`,
      })

      // Close the modal
      onClose()

      // Reset form
      setSubject("")
      setMessage("")
      setContactMethod("email")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier-name" className="text-right">
                Supplier
              </Label>
              <Input id="supplier-name" value={supplier.name} disabled className="col-span-3" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact-person" className="text-right whitespace-nowrap">
                Contact Person
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact-person"
                  value={supplier.contactPerson || "Not specified"}
                  disabled
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact-method" className="text-right whitespace-nowrap">
                Contact Method
              </Label>
              <div className="col-span-3">
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {contactMethod === "email" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={supplier.email || supplier.contact || "Not specified"}
                      disabled
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="message" className="text-right">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="col-span-3"
                    rows={5}
                    required
                  />
                </div>
              </>
            )}

            {contactMethod === "phone" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input id="phone" value={supplier.phone || "Not specified"} disabled className="flex-1" />
                  <Button type="button" variant="outline">
                    Call
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || contactMethod === "phone"}>
              {isSubmitting ? "Sending..." : contactMethod === "email" ? "Send Message" : "Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
