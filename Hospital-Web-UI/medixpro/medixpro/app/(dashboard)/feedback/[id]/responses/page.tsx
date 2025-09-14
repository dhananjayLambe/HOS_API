"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  MessageSquare,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

// Mock data for the survey
const survey = {
  id: "1",
  title: "Patient Satisfaction Survey",
  description: "General satisfaction survey for all patients after their visit",
  status: "active",
  responses: 128,
  createdAt: "2023-03-15",
  lastUpdated: "2023-04-10",
  averageRating: 4.2,
  completionRate: 78,
  questions: [
    {
      id: "q1",
      type: "rating",
      required: true,
      text: "How would you rate your overall experience?",
      options: ["1", "2", "3", "4", "5"],
    },
    {
      id: "q2",
      type: "multiple-choice",
      required: true,
      text: "How long did you wait before being seen?",
      options: ["Less than 15 minutes", "15-30 minutes", "30-60 minutes", "More than 60 minutes"],
    },
    {
      id: "q3",
      type: "text",
      required: false,
      text: "What did you like most about your visit?",
    },
    {
      id: "q4",
      type: "text",
      required: false,
      text: "What could we improve?",
    },
    {
      id: "q5",
      type: "multiple-choice",
      required: true,
      text: "Would you recommend our clinic to friends and family?",
      options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"],
    },
  ],
}

// Mock data for responses
const allResponses = [
  {
    id: "r1",
    patientId: "p123",
    patientName: "John Smith",
    submittedAt: "2023-04-15T14:30:00",
    department: "General Medicine",
    answers: [
      { questionId: "q1", value: "5" },
      { questionId: "q2", value: "Less than 15 minutes" },
      {
        questionId: "q3",
        value: "The staff was very professional and caring. I felt well taken care of during my visit.",
      },
      { questionId: "q4", value: "Nothing, everything was great!" },
      { questionId: "q5", value: "Definitely" },
    ],
  },
  {
    id: "r2",
    patientId: "p456",
    patientName: "Maria Garcia",
    submittedAt: "2023-04-14T09:15:00",
    department: "Emergency",
    answers: [
      { questionId: "q1", value: "3" },
      { questionId: "q2", value: "30-60 minutes" },
      { questionId: "q3", value: "The doctor was very knowledgeable." },
      { questionId: "q4", value: "Wait time was too long, but the medical care was good once I was seen." },
      { questionId: "q5", value: "Probably" },
    ],
  },
  {
    id: "r3",
    patientId: "p789",
    patientName: "Robert Johnson",
    submittedAt: "2023-04-13T16:45:00",
    department: "Cardiology",
    answers: [
      { questionId: "q1", value: "4" },
      { questionId: "q2", value: "15-30 minutes" },
      { questionId: "q3", value: "The doctor took time to explain everything clearly." },
      { questionId: "q4", value: "The video quality could be better, but the doctor was very thorough and helpful." },
      { questionId: "q5", value: "Definitely" },
    ],
  },
  {
    id: "r4",
    patientId: "p101",
    patientName: "Emily Wilson",
    submittedAt: "2023-04-12T11:20:00",
    department: "Pediatrics",
    answers: [
      { questionId: "q1", value: "5" },
      { questionId: "q2", value: "Less than 15 minutes" },
      { questionId: "q3", value: "The pediatrician was amazing with my child." },
      {
        questionId: "q4",
        value: "Excellent service from start to finish. The new online check-in system is very convenient.",
      },
      { questionId: "q5", value: "Definitely" },
    ],
  },
  {
    id: "r5",
    patientId: "p202",
    patientName: "David Chen",
    submittedAt: "2023-04-11T22:05:00",
    department: "Emergency",
    answers: [
      { questionId: "q1", value: "2" },
      { questionId: "q2", value: "More than 60 minutes" },
      { questionId: "q3", value: "The nurses were attentive once I was admitted." },
      {
        questionId: "q4",
        value: "The emergency room was overcrowded and I had to wait for hours. The staff seemed overwhelmed.",
      },
      { questionId: "q5", value: "Probably not" },
    ],
  },
  {
    id: "r6",
    patientId: "p303",
    patientName: "Sarah Brown",
    submittedAt: "2023-04-10T13:40:00",
    department: "General Medicine",
    answers: [
      { questionId: "q1", value: "4" },
      { questionId: "q2", value: "15-30 minutes" },
      { questionId: "q3", value: "The doctor was very thorough and listened to all my concerns." },
      { questionId: "q4", value: "The waiting area could use more comfortable seating." },
      { questionId: "q5", value: "Probably" },
    ],
  },
  {
    id: "r7",
    patientId: "p404",
    patientName: "Michael Lee",
    submittedAt: "2023-04-09T10:15:00",
    department: "Orthopedics",
    answers: [
      { questionId: "q1", value: "5" },
      { questionId: "q2", value: "Less than 15 minutes" },
      { questionId: "q3", value: "The specialist was excellent and the treatment plan is working well." },
      { questionId: "q4", value: "Nothing to improve, very satisfied." },
      { questionId: "q5", value: "Definitely" },
    ],
  },
  {
    id: "r8",
    patientId: "p505",
    patientName: "Jennifer Taylor",
    submittedAt: "2023-04-08T15:30:00",
    department: "Dermatology",
    answers: [
      { questionId: "q1", value: "3" },
      { questionId: "q2", value: "30-60 minutes" },
      { questionId: "q3", value: "The doctor was knowledgeable about my skin condition." },
      {
        questionId: "q4",
        value: "Appointment scheduling could be improved. I had to wait several weeks for an appointment.",
      },
      { questionId: "q5", value: "Not sure" },
    ],
  },
]

export default function FeedbackResponsesPage() {
  const params = useParams()
  const surveyId = params.id as string

  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  // Get unique departments for filter
  const departments = Array.from(new Set(allResponses.map((r) => r.department)))

  // Filter responses based on search term and filters
  const filteredResponses = allResponses.filter((response) => {
    const matchesSearch =
      response.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.answers.some((a) => a.value.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesDepartment = departmentFilter === "all" || response.department === departmentFilter

    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "positive" && getOverallRating(response) >= 4) ||
      (ratingFilter === "neutral" && getOverallRating(response) === 3) ||
      (ratingFilter === "negative" && getOverallRating(response) <= 2)

    return matchesSearch && matchesDepartment && matchesRating
  })

  // Function to get the overall rating from a response
  function getOverallRating(response: (typeof allResponses)[0]): number {
    const ratingAnswer = response.answers.find((a) => a.questionId === "q1")
    return ratingAnswer ? Number.parseInt(ratingAnswer.value) : 0
  }

  // Function to get the answer for a specific question
  function getAnswer(response: (typeof allResponses)[0], questionId: string): string {
    const answer = response.answers.find((a) => a.questionId === questionId)
    return answer ? answer.value : "N/A"
  }

  // Function to get the selected response
  function getSelectedResponseData() {
    return allResponses.find((r) => r.id === selectedResponse)
  }

  // Function to handle reply submission
  function handleReplySubmit() {
    // In a real app, this would call an API to send the reply
    console.log(`Sending reply to response ${selectedResponse}: ${replyText}`)
    setReplyText("")
    // You would typically close the dialog or show a success message here
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/feedback/${surveyId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{survey.title} - Responses</h1>
            <p className="text-muted-foreground">View and analyze patient feedback</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/feedback/${surveyId}`}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Survey Details
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Summary</CardTitle>
          <CardDescription>Overview of all responses to this survey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Total Responses</div>
              <div className="text-2xl font-bold">{allResponses.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Average Rating</div>
              <div className="text-2xl font-bold flex items-center">
                {(allResponses.reduce((acc, r) => acc + getOverallRating(r), 0) / allResponses.length).toFixed(1)}
                <span className="text-yellow-500 ml-1">★</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Positive Feedback</div>
              <div className="text-2xl font-bold">
                {allResponses.filter((r) => getOverallRating(r) >= 4).length}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  (
                  {Math.round(
                    (allResponses.filter((r) => getOverallRating(r) >= 4).length / allResponses.length) * 100,
                  )}
                  %)
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Negative Feedback</div>
              <div className="text-2xl font-bold">
                {allResponses.filter((r) => getOverallRating(r) <= 2).length}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  (
                  {Math.round(
                    (allResponses.filter((r) => getOverallRating(r) <= 2).length / allResponses.length) * 100,
                  )}
                  %)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="individual">Individual Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search responses..."
                  className="pl-8 w-[200px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="positive">Positive (4-5)</SelectItem>
                  <SelectItem value="neutral">Neutral (3)</SelectItem>
                  <SelectItem value="negative">Negative (1-2)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredResponses.length} of {allResponses.length} responses
            </div>
          </div>

          <div className="rounded-md border">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Wait Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">{response.patientName}</TableCell>
                    <TableCell>{response.department}</TableCell>
                    <TableCell>{new Date(response.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${
                              star <= getOverallRating(response) ? "text-yellow-500" : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getAnswer(response, "q5")}</TableCell>
                    <TableCell>{getAnswer(response, "q2")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <span className="sr-only">Open menu</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedResponse(response.id)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>View Patient History</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search responses..."
                  className="pl-8 w-[200px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="positive">Positive (4-5)</SelectItem>
                  <SelectItem value="neutral">Neutral (3)</SelectItem>
                  <SelectItem value="negative">Negative (1-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredResponses.length} of {allResponses.length} responses
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{response.patientName}</CardTitle>
                      <CardDescription>
                        {response.department} • {new Date(response.submittedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= getOverallRating(response) ? "text-yellow-500" : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">Wait Time</div>
                      <div>{getAnswer(response, "q2")}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">What they liked</div>
                      <div className="text-sm line-clamp-2">{getAnswer(response, "q3")}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Improvement suggestions</div>
                      <div className="text-sm line-clamp-2">{getAnswer(response, "q4")}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Would recommend</div>
                      <div>{getAnswer(response, "q5")}</div>
                    </div>
                  </div>
                </CardContent>
                <div className="bg-muted p-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedResponse(response.id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Response Details Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
            <DialogDescription>Detailed view of the patient's feedback</DialogDescription>
          </DialogHeader>
          {selectedResponse && getSelectedResponseData() && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <h3 className="font-medium">{getSelectedResponseData()?.patientName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getSelectedResponseData()?.department} •
                    {new Date(getSelectedResponseData()?.submittedAt || "").toLocaleString()}
                  </p>
                </div>
                <div className="flex mt-2 md:mt-0">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= getOverallRating(getSelectedResponseData()!) ? "text-yellow-500" : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {survey.questions.map((question) => (
                  <div key={question.id} className="space-y-1">
                    <div className="font-medium">{question.text}</div>
                    <div className="text-sm">{getAnswer(getSelectedResponseData()!, question.id)}</div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Reply to Patient</h4>
                <Textarea
                  placeholder="Type your response here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button onClick={handleReplySubmit} disabled={!replyText.trim()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
