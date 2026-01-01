"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Eye, MessageSquare, Loader2, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { 
  getSupportTickets, 
  getSupportTicket, 
  addTicketComment,
  type SupportTicket,
  type SupportTicketComment 
} from "@/lib/supportApi"

// Sample ticket data (fallback)
const sampleTickets = [
  {
    id: "T-1001",
    subject: "Cannot access patient records",
    category: "technical",
    priority: "high",
    status: "open",
    created: "2023-04-25T10:30:00",
    updated: "2023-04-25T14:45:00",
    description:
      "I'm unable to access patient records for the past 24 hours. The system shows an error message saying 'Database connection failed'.",
    responses: [
      {
        id: "R-1",
        from: "Support Team",
        message:
          "Thank you for reporting this issue. We're investigating the database connection problem and will update you shortly.",
        timestamp: "2023-04-25T11:15:00",
      },
    ],
  },
  {
    id: "T-1002",
    subject: "Billing module calculation error",
    category: "billing",
    priority: "medium",
    status: "in-progress",
    created: "2023-04-23T09:15:00",
    updated: "2023-04-24T16:30:00",
    description:
      "The billing module is incorrectly calculating insurance deductions. It's applying a 15% deduction when it should be 10% according to our contract.",
    responses: [
      {
        id: "R-2",
        from: "Support Team",
        message:
          "We've identified the issue with the insurance deduction calculation. Our development team is working on a fix.",
        timestamp: "2023-04-23T11:45:00",
      },
      {
        id: "R-3",
        from: "Development Team",
        message:
          "We've deployed a hotfix for the calculation issue. Please verify if the deductions are now correctly applied at 10%.",
        timestamp: "2023-04-24T16:30:00",
      },
    ],
  },
  {
    id: "T-1003",
    subject: "Need additional user licenses",
    category: "account",
    priority: "low",
    status: "resolved",
    created: "2023-04-20T14:00:00",
    updated: "2023-04-21T10:20:00",
    description: "We need to add 5 more user licenses to our account as we've hired new staff members.",
    responses: [
      {
        id: "R-4",
        from: "Account Manager",
        message:
          "I've added 5 additional user licenses to your account. The updated invoice has been sent to your billing email.",
        timestamp: "2023-04-21T10:20:00",
      },
    ],
  },
  {
    id: "T-1004",
    subject: "Feature request: Export to PDF",
    category: "feature",
    priority: "medium",
    status: "open",
    created: "2023-04-18T11:30:00",
    updated: "2023-04-18T11:30:00",
    description:
      "We would like to request a feature to export patient reports directly to PDF format instead of just CSV.",
    responses: [],
  },
  {
    id: "T-1005",
    subject: "System performance issues",
    category: "technical",
    priority: "high",
    status: "in-progress",
    created: "2023-04-15T08:45:00",
    updated: "2023-04-17T13:10:00",
    description:
      "The system has been extremely slow for the past few days, especially during peak hours (9-11 AM). This is affecting our ability to check in patients efficiently.",
    responses: [
      {
        id: "R-5",
        from: "Technical Support",
        message:
          "We're investigating the performance issues. Initial analysis suggests high database load during those hours.",
        timestamp: "2023-04-15T10:30:00",
      },
      {
        id: "R-6",
        from: "System Administrator",
        message:
          "We've optimized some database queries and increased server resources. Please monitor the performance and let us know if you still experience slowdowns.",
        timestamp: "2023-04-17T13:10:00",
      },
    ],
  },
]

export function SupportTicketList() {
  const toast = useToastNotification()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState("")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Fetch tickets from API
  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const response = await getSupportTickets({
        page: 1,
        page_size: 50,
      })
      
      if (response.status === "success" && response.data?.tickets) {
        setTickets(response.data.tickets)
      } else {
        throw new Error(response.message || "Failed to fetch tickets")
      }
    } catch (error: any) {
      console.error("Error fetching tickets:", error)
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          error.message ||
                          "Failed to load support tickets. Please try again later."
      toast.error(errorMessage)
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewTicket = async (ticketId: string) => {
    try {
      setIsLoadingDetail(true)
      const response = await getSupportTicket(ticketId)
      
      if (response.status === "success" && response.data) {
        setSelectedTicket(response.data)
      } else {
        throw new Error(response.message || "Failed to fetch ticket details")
      }
    } catch (error: any) {
      console.error("Error fetching ticket details:", error)
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          error.message ||
                          "Failed to load ticket details. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return

    try {
      setIsSubmittingComment(true)
      const response = await addTicketComment(selectedTicket.id, replyText.trim())
      
      if (response.status === "success") {
        toast.success("Your reply has been sent to the support team.")
        
        // Refresh ticket details to show the new comment
        await handleViewTicket(selectedTicket.id)
        setReplyText("")
      } else {
        throw new Error(response.message || "Failed to send reply")
      }
    } catch (error: any) {
      console.error("Error sending reply:", error)
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.response?.data?.data?.message ||
                          error.message ||
                          "Failed to send reply. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
            Open
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">
            In Progress
          </Badge>
        )
      case "waiting_for_user":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300">
            Waiting for User
          </Badge>
        )
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-300">
            Resolved
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300">
            Closed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300">
            Low
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
            Medium
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300">
            High
          </Badge>
        )
      case "critical":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-300">
            Critical
          </Badge>
        )
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Support Tickets</CardTitle>
          <CardDescription>View and manage your support tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading tickets...</span>
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="rounded-md border">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(ticket.created_at)}</TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewTicket(ticket.id)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View ticket</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleViewTicket(ticket.id)
                              setReplyText("")
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">Reply to ticket</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading ticket details...</span>
            </div>
          ) : selectedTicket ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Ticket {selectedTicket.ticket_number} - {selectedTicket.subject}
                </DialogTitle>
                <DialogDescription>Created on {formatDate(selectedTicket.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="capitalize mt-1">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="mt-1">{formatDate(selectedTicket.updated_at)}</p>
                </div>
                {selectedTicket.created_by_name && (
                  <div>
                    <p className="text-sm font-medium">Created By</p>
                    <p className="mt-1">{selectedTicket.created_by_name}</p>
                  </div>
                )}
                {selectedTicket.assigned_to_name && (
                  <div>
                    <p className="text-sm font-medium">Assigned To</p>
                    <p className="mt-1">{selectedTicket.assigned_to_name}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Attachments ({selectedTicket.attachments.length})</p>
                  <div className="space-y-2">
                    {selectedTicket.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Comments ({selectedTicket.comments.length})</p>
                  <div className="space-y-4">
                    {selectedTicket.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted p-3 rounded-md">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium">{comment.created_by_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Add Comment</p>
                <Textarea
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setSelectedTicket(null)
                  setReplyText("")
                }}>
                  Close
                </Button>
                <Button 
                  onClick={handleReply} 
                  disabled={!replyText.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reply"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
