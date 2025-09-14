"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Archive, File, Inbox, MailPlus, Search, Send, Star, Trash2, AlertCircle, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { EmailList } from "@/components/email/email-list"
import { ComposeEmailModal } from "@/components/email/compose-email-modal"
import { EmailPagination } from "@/components/email/email-pagination"

interface Email {
  id: string
  from: string
  to: string
  subject: string
  body: string
  date: string
  read: boolean
  starred: boolean
  important: boolean
  labels: string[]
  folder: string
}

// Mock data for emails
const mockEmails: Email[] = [
  {
    id: "1",
    from: "dr.johnson@medixpro.com",
    to: "patient.smith@example.com",
    subject: "Your Recent Test Results",
    body: "Dear Mr. Smith, I'm pleased to inform you that your recent blood tests came back normal. No further action is needed at this time.",
    date: "2023-04-15T10:30:00",
    read: true,
    starred: false,
    important: true,
    labels: ["patient", "test-results"],
    folder: "inbox",
  },
  {
    id: "2",
    from: "admin@medixpro.com",
    to: "dr.johnson@medixpro.com",
    subject: "Staff Meeting - April 20th",
    body: "Dear Dr. Johnson, This is a reminder about the upcoming staff meeting on April 20th at 9:00 AM in Conference Room A.",
    date: "2023-04-14T15:45:00",
    read: false,
    starred: true,
    important: true,
    labels: ["admin", "meeting"],
    folder: "inbox",
  },
  {
    id: "3",
    from: "dr.johnson@medixpro.com",
    to: "pharmacy@medixpro.com",
    subject: "Prescription Refill for Patient #12345",
    body: "Please prepare a refill for Patient #12345's hypertension medication. The prescription details are attached.",
    date: "2023-04-13T11:20:00",
    read: true,
    starred: false,
    important: false,
    labels: ["pharmacy", "prescription"],
    folder: "sent",
  },
  {
    id: "4",
    from: "dr.johnson@medixpro.com",
    to: "lab@medixpro.com",
    subject: "Lab Test Request for Patient #67890",
    body: "Please schedule a comprehensive metabolic panel for Patient #67890 at their earliest convenience.",
    date: "2023-04-12T09:15:00",
    read: true,
    starred: false,
    important: false,
    labels: ["lab", "test-request"],
    folder: "sent",
  },
  {
    id: "5",
    from: "dr.johnson@medixpro.com",
    to: "patient.doe@example.com",
    subject: "Follow-up Appointment Recommendation",
    body: "Dear Ms. Doe, Based on your recent visit, I recommend scheduling a follow-up appointment in 3 months.",
    date: "2023-04-11T16:30:00",
    read: true,
    starred: true,
    important: false,
    labels: ["patient", "follow-up"],
    folder: "draft",
  },
  {
    id: "6",
    from: "insurance@healthcare.com",
    to: "dr.johnson@medixpro.com",
    subject: "Claim #87654 - Additional Information Required",
    body: "We need additional documentation for claim #87654. Please provide the requested information within 14 days.",
    date: "2023-04-10T13:45:00",
    read: false,
    starred: false,
    important: true,
    labels: ["insurance", "claim"],
    folder: "inbox",
  },
  {
    id: "7",
    from: "dr.johnson@medixpro.com",
    to: "conference@medical-association.org",
    subject: "Registration for Annual Medical Conference",
    body: "I would like to register for the upcoming Annual Medical Conference on May 15-17.",
    date: "2023-04-09T10:00:00",
    read: true,
    starred: false,
    important: false,
    labels: ["conference", "professional"],
    folder: "trash",
  },
  {
    id: "8",
    from: "supplies@medical-equipment.com",
    to: "dr.johnson@medixpro.com",
    subject: "New Product Catalog - Q2 2023",
    body: "Attached is our latest product catalog for Q2 2023. Special discounts available for returning customers.",
    date: "2023-04-08T14:20:00",
    read: true,
    starred: false,
    important: false,
    labels: ["supplies", "catalog"],
    folder: "trash",
  },
  {
    id: "9",
    from: "dr.smith@medixpro.com",
    to: "dr.johnson@medixpro.com",
    subject: "Patient Referral - Cardiology Consultation",
    body: "I'm referring Patient #54321 to you for a cardiology consultation. Patient records attached.",
    date: "2023-04-07T11:30:00",
    read: false,
    starred: true,
    important: true,
    labels: ["referral", "cardiology"],
    folder: "inbox",
  },
  {
    id: "10",
    from: "dr.johnson@medixpro.com",
    to: "it@medixpro.com",
    subject: "Technical Issue with Patient Portal",
    body: "I'm experiencing difficulties accessing the patient portal. Could you please assist?",
    date: "2023-04-06T09:45:00",
    read: true,
    starred: false,
    important: false,
    labels: ["it", "technical"],
    folder: "sent",
  },
  {
    id: "11",
    from: "hr@medixpro.com",
    to: "dr.johnson@medixpro.com",
    subject: "Annual Leave Balance Update",
    body: "This is a reminder that you have 15 days of annual leave remaining that must be used before December 31st.",
    date: "2023-04-05T16:15:00",
    read: true,
    starred: false,
    important: false,
    labels: ["hr", "leave"],
    folder: "inbox",
  },
  {
    id: "12",
    from: "dr.johnson@medixpro.com",
    to: "research@medical-journal.org",
    subject: "Submission of Research Paper",
    body: "Please find attached my research paper titled 'Advances in Telemedicine During the Pandemic' for consideration in your journal.",
    date: "2023-04-04T13:00:00",
    read: true,
    starred: true,
    important: true,
    labels: ["research", "publication"],
    folder: "draft",
  },
]

export default function EmailPage() {
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState(mockEmails)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState(searchParams.get("folder") || "inbox")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const emailsPerPage = 5

  // Filter emails based on active tab, search query, and other filters
  const filteredEmails = emails.filter((email) => {
    // Filter by folder/tab
    if (activeTab === "starred") {
      if (!email.starred) return false
    } else if (activeTab === "important") {
      if (!email.important) return false
    } else if (email.folder !== activeTab) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.to.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Pagination logic
  const indexOfLastEmail = currentPage * emailsPerPage
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage
  const currentEmails = filteredEmails.slice(indexOfFirstEmail, indexOfLastEmail)
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage)

  // Handle email selection
  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) => (prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]))
  }

  // Handle email actions
  const handleArchive = () => {
    setEmails((prev) =>
      prev.map((email) => (selectedEmails.includes(email.id) ? { ...email, folder: "archive" } : email)),
    )
    setSelectedEmails([])
  }

  const handleDelete = () => {
    setEmails((prev) =>
      prev.map((email) => (selectedEmails.includes(email.id) ? { ...email, folder: "trash" } : email)),
    )
    setSelectedEmails([])
  }

  const handleStar = () => {
    setEmails((prev) =>
      prev.map((email) => (selectedEmails.includes(email.id) ? { ...email, starred: !email.starred } : email)),
    )
    setSelectedEmails([])
  }

  const handleMarkImportant = () => {
    setEmails((prev) =>
      prev.map((email) => (selectedEmails.includes(email.id) ? { ...email, important: !email.important } : email)),
    )
    setSelectedEmails([])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Email</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsComposeOpen(true)} className="gap-1">
            <MailPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Compose</span>
          </Button>
        </div>
      </div>
      <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden mb-3"> <Mail className="h-4 w-4" /> Open Menu</Button>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[240px_1fr] xl:grid-cols-[300px_1fr] relative">     
        <div className={`border-r !pl-0 p-2 lg:p-4 max-md:absolute max-md:left-0 max-md:top-0 max-md:bg-background max-md:!px-3 max-md:h-full max-md:z-[2] duration-300 ${isSidebarOpen ? "translate-x-0" : "max-md:-translate-x-full"}`}>
          <div className="space-y-1">
            <Button
              variant={activeTab === "inbox" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("inbox")}
            >
              <Inbox className="h-4 w-4" />
              Inbox
            </Button>
            <Button
              variant={activeTab === "sent" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("sent")}
            >
              <Send className="h-4 w-4" />
              Sent
            </Button>
            <Button
              variant={activeTab === "draft" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("draft")}
            >
              <File className="h-4 w-4" />
              Draft
            </Button>
            <Button
              variant={activeTab === "trash" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("trash")}
            >
              <Trash2 className="h-4 w-4" />
              Bin
            </Button>
            <Button
              variant={activeTab === "archive" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("archive")}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
            <Separator className="my-2" />
            <Button
              variant={activeTab === "important" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("important")}
            >
              <AlertCircle className="h-4 w-4" />
              Important
            </Button>
            <Button
              variant={activeTab === "starred" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("starred")}
            >
              <Star className="h-4 w-4" />
              Starred
            </Button>
            <Separator className="my-2" />
            <div className="py-2">
              <h3 className="mb-2 text-sm font-medium">Labels</h3>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Patient
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Admin
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Lab
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Pharmacy
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Insurance
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between  border-b p-2 lg:p-4 flex-wrap gap-4">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search emails..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedEmails.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleArchive}>
                    <Archive className="h-4 w-4" />
                    <span className="sr-only">Archive</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleStar}>
                    <Star className="h-4 w-4" />
                    <span className="sr-only">Star</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleMarkImportant}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="sr-only">Mark Important</span>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1">
            <EmailList
              emails={currentEmails}
              selectedEmails={selectedEmails}
              onSelectEmail={toggleEmailSelection}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onStar={handleStar}
              onMarkImportant={handleMarkImportant}
            />
          </div>
          <div className="border-t p-4">
            <EmailPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={(email: any) => {
          setEmails([
            ...emails,
            {
              ...email,
              id: (emails.length + 1).toString(),
              date: new Date().toISOString(),
              read: true,
              starred: false,
              important: false,
              labels: [],
              folder: "sent",
            },
          ])
          setIsComposeOpen(false)
        }}
      />
    </div>
  )
}
