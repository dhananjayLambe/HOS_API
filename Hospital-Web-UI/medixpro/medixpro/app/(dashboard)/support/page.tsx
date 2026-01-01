"use client"

import type React from "react"
import dynamic from "next/dynamic"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { HelpCircle, Ticket, FileText, MessageSquare, Upload, Send, Loader2, X, AlertCircle } from "lucide-react"
import Image from "next/image"
import logo from "@/public/icon.png"
import { createSupportTicket, uploadTicketAttachment } from "@/lib/supportApi"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Dynamically import heavy components for better performance
const SupportTicketList = dynamic(() => import("@/components/support/support-ticket-list").then(mod => ({ default: mod.SupportTicketList })), {
  loading: () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Loading tickets...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
});

const SupportFAQ = dynamic(() => import("@/components/support/support-faq").then(mod => ({ default: mod.SupportFAQ })), {
  loading: () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Loading FAQ...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
});

export default function SupportPage() {
  const toast = useToastNotification()
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "",
    description: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [apiErrors, setApiErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user selects a value
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Subject validation
    if (!formData.subject || !formData.subject.trim()) {
      errors.subject = "Subject is required"
    } else if (formData.subject.trim().length < 5) {
      errors.subject = "Subject must be at least 5 characters long"
    } else if (formData.subject.length > 255) {
      errors.subject = "Subject cannot exceed 255 characters"
    }

    // Category validation
    if (!formData.category) {
      errors.category = "Please select a category"
    }

    // Priority validation
    if (!formData.priority) {
      errors.priority = "Please select a priority level"
    }

    // Description validation
    if (!formData.description || !formData.description.trim()) {
      errors.description = "Description is required"
    } else if (formData.description.trim().length < 20) {
      errors.description = "Description must be at least 20 characters long"
    } else if (formData.description.length > 10000) {
      errors.description = "Description cannot exceed 10,000 characters"
    }

    setFormErrors(errors)
    setApiErrors([]) // Clear API errors when validating
    return Object.keys(errors).length === 0
  }

  // Extract and format API errors into readable messages
  const extractApiErrors = (error: any): { fieldErrors: Record<string, string>, generalErrors: string[] } => {
    const fieldErrors: Record<string, string> = {}
    const generalErrors: string[] = []

    // Field name mapping from backend to frontend
    const fieldNameMap: Record<string, string> = {
      subject: 'subject',
      description: 'description',
      category: 'category',
      priority: 'priority',
    }

    // Helper to format error message
    const formatErrorMessage = (msg: string): string => {
      // Capitalize first letter and ensure proper punctuation
      let formatted = msg.trim()
      if (formatted && !formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
        formatted += '.'
      }
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    if (error.response?.data) {
      const errorData = error.response.data

      // Handle validation errors from backend (data.data format)
      if (errorData.data && typeof errorData.data === 'object' && !Array.isArray(errorData.data)) {
        Object.entries(errorData.data).forEach(([key, value]: [string, any]) => {
          const normalizedKey = key.toLowerCase().replace(/_/g, '')
          const frontendField = fieldNameMap[normalizedKey] || normalizedKey
          
          if (Array.isArray(value) && value.length > 0) {
            // Join multiple errors with proper formatting
            const errorMsg = value
              .map((v: any) => typeof v === 'string' ? formatErrorMessage(v) : String(v))
              .join(' ')
            fieldErrors[frontendField] = errorMsg
          } else if (typeof value === 'string' && value.trim()) {
            fieldErrors[frontendField] = formatErrorMessage(value)
          }
        })
      }

      // Handle errors object
      if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
        Object.entries(errorData.errors).forEach(([key, value]: [string, any]) => {
          const normalizedKey = key.toLowerCase().replace(/_/g, '')
          const frontendField = fieldNameMap[normalizedKey] || normalizedKey
          
          if (Array.isArray(value) && value.length > 0) {
            const errorMsg = value
              .map((v: any) => typeof v === 'string' ? formatErrorMessage(v) : String(v))
              .join(' ')
            fieldErrors[frontendField] = errorMsg
          } else if (typeof value === 'string' && value.trim()) {
            fieldErrors[frontendField] = formatErrorMessage(value)
          }
        })
      }

      // Handle general error messages (prioritize most specific)
      if (errorData.data?.message && typeof errorData.data.message === 'string') {
        generalErrors.push(formatErrorMessage(errorData.data.message))
      } else if (errorData.error && typeof errorData.error === 'string') {
        generalErrors.push(formatErrorMessage(errorData.error))
      } else if (errorData.message && typeof errorData.message === 'string') {
        generalErrors.push(formatErrorMessage(errorData.message))
      } else if (errorData.detail && typeof errorData.detail === 'string') {
        generalErrors.push(formatErrorMessage(errorData.detail))
      }
    } else if (error.message && typeof error.message === 'string') {
      generalErrors.push(formatErrorMessage(error.message))
    }

    // If no specific errors found, add a generic message
    if (Object.keys(fieldErrors).length === 0 && generalErrors.length === 0) {
      generalErrors.push("An error occurred while creating the support ticket. Please try again.")
    }

    return { fieldErrors, generalErrors }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit`)
          return false
        }
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          toast.error(`${file.name} is not a valid file type. Only PDF, JPG, and PNG are allowed.`)
          return false
        }
        return true
      })
      
      const totalFiles = selectedFiles.length + validFiles.length
      if (totalFiles > 5) {
        toast.error("Maximum 5 files allowed. Please remove some files first.")
        return
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      const errorCount = Object.keys(formErrors).length
      toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form before submitting`)
      return
    }

    setIsSubmitting(true)
    setApiErrors([]) // Clear previous API errors

    try {
      // Create the support ticket
      const ticketData = {
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        category: formData.category as "technical" | "billing" | "appointment" | "prescription" | "account" | "other",
        priority: (formData.priority || "medium") as "low" | "medium" | "high" | "critical",
      }

      const response = await createSupportTicket(ticketData)

      if (response.status === "success" && response.data) {
        const ticketId = response.data.id

        // Upload attachments if any
        if (selectedFiles.length > 0) {
          try {
            const uploadPromises = selectedFiles.map(file => 
              uploadTicketAttachment(ticketId, file)
            )
            await Promise.all(uploadPromises)
          } catch (uploadError: any) {
            console.error("Error uploading attachments:", uploadError)
            const uploadErrorMessage = uploadError.response?.data?.error || 
                                      uploadError.response?.data?.message ||
                                      uploadError.message ||
                                      "Failed to upload some attachments"
            // Ticket was created, but attachments failed - show warning
            toast.error(`Ticket created successfully, but some attachments failed to upload: ${uploadErrorMessage}. You can add them later.`)
          }
        }

        toast.success(`Your ticket ${response.data.ticket_number} has been submitted successfully. We'll get back to you soon.`)

        // Reset form
        setFormData({
          subject: "",
          category: "",
          priority: "",
          description: "",
        })
        setSelectedFiles([])
        setFormErrors({})
        setApiErrors([])
      } else {
        throw new Error(response.message || "Failed to create ticket")
      }
    } catch (error: any) {
      console.error("Error creating support ticket:", error)
      
      // Extract and format errors
      const { fieldErrors, generalErrors } = extractApiErrors(error)
      
      // Set field-level errors
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(prev => ({ ...prev, ...fieldErrors }))
      }
      
      // Set general API errors
      if (generalErrors.length > 0) {
        setApiErrors(generalErrors)
        // Show first general error in toast
        toast.error(generalErrors[0])
      } else {
        toast.error("An error occurred while creating the support ticket. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
            <Image src={logo} alt="MedixPro" width={32} height={32} className="rounded" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Support Center</h1>
            <p className="text-muted-foreground">Get help with your clinic management system or submit a support ticket.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="new-ticket" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new-ticket" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            New Ticket
          </TabsTrigger>
          <TabsTrigger value="my-tickets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-ticket" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500 text-white">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Submit a Support Ticket</CardTitle>
                  <CardDescription>
                    Fill out the form below to create a new support ticket. Our team will respond as soon as possible.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* API Error Alert */}
                {apiErrors.length > 0 && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Please fix the following issues:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-sm">
                          {apiErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Brief description of the issue"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className={formErrors.subject ? "border-destructive" : ""}
                    />
                    {formErrors.subject && (
                      <div className="flex items-start gap-1.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{formErrors.subject}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Minimum 5 characters, maximum 255 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange("category", value)}
                      required
                    >
                      <SelectTrigger id="category" className={formErrors.category ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                        <SelectItem value="appointment">Appointment / Scheduling</SelectItem>
                        <SelectItem value="prescription">Prescription / EMR</SelectItem>
                        <SelectItem value="account">Account Management</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.category && (
                      <div className="flex items-start gap-1.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{formErrors.category}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select the category that best describes your issue
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                    required
                  >
                    <SelectTrigger id="priority" className={formErrors.priority ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question or request</SelectItem>
                      <SelectItem value="medium">Medium - Issue affecting workflow</SelectItem>
                      <SelectItem value="high">High - Critical issue affecting operations</SelectItem>
                      <SelectItem value="critical">Critical - System down or inaccessible</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.priority && (
                    <div className="flex items-start gap-1.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{formErrors.priority}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select the urgency level of your issue. Critical issues are for system outages.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Please provide detailed information about your issue. Include steps to reproduce, expected behavior, and any error messages."
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className={formErrors.description ? "border-destructive" : ""}
                  />
                  {formErrors.description && (
                    <div className="flex items-start gap-1.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{formErrors.description}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimum 20 characters, maximum 10000 characters. Include as much detail as possible to help us assist you.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current: {formData.description.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachments" className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Attachments (optional)
                  </Label>
                  <Input 
                    id="attachments" 
                    type="file" 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={selectedFiles.length >= 5}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can upload screenshots or documents to help explain your issue. Allowed formats: PDF, JPG, PNG. Maximum 5MB per file, up to 5 files total.
                  </p>
                  {selectedFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-md border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setFormData({
                    subject: "",
                    category: "",
                    priority: "",
                    description: "",
                  })
                  setSelectedFiles([])
                  setFormErrors({})
                  setApiErrors([])
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
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
