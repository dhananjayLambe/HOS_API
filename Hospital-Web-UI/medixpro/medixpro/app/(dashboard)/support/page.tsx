"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SupportTicketList } from "@/components/support/support-ticket-list"
import { SupportFAQ } from "@/components/support/support-faq"
import { useToast } from "@/components/ui/use-toast"

export default function SupportPage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Support ticket submitted",
        description: "Your ticket has been submitted successfully. We'll get back to you soon.",
      })
      setFormData({
        subject: "",
        category: "",
        priority: "",
        description: "",
      })
    }, 1500)
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">Get help with your clinic management system or submit a support ticket.</p>
      </div>

      <Tabs defaultValue="new-ticket" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new-ticket">New Ticket</TabsTrigger>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="new-ticket" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>
                Fill out the form below to create a new support ticket. Our team will respond as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Brief description of the issue"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange("category", value)}
                      required
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                        <SelectItem value="account">Account Management</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                    required
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question or request</SelectItem>
                      <SelectItem value="medium">Medium - Issue affecting workflow</SelectItem>
                      <SelectItem value="high">High - Critical issue affecting operations</SelectItem>
                      <SelectItem value="urgent">Urgent - System down or inaccessible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Please provide detailed information about your issue"
                    rows={5}
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachments">Attachments (optional)</Label>
                  <Input id="attachments" type="file" multiple />
                  <p className="text-xs text-muted-foreground">
                    You can upload screenshots or documents to help explain your issue (max 5MB per file)
                  </p>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setFormData({
                    subject: "",
                    category: "",
                    priority: "",
                    description: "",
                  })
                }
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="my-tickets" className="mt-6">
          <SupportTicketList />
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <SupportFAQ />
        </TabsContent>
      </Tabs>
    </div>
  )
}
