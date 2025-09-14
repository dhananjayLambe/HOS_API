"use client"

import { useState } from "react"
import Link from "next/link"
import {
  FileText,
  Filter,
  MessageSquare,
  MoreHorizontal,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  RatingDistributionChart,
  ResponseTrendChart,
  DepartmentFeedbackChart,
  SentimentAnalysisChart,
} from "@/components/feedback/analytics"

// Mock data for feedback surveys
const surveys = [
  {
    id: "1",
    title: "Patient Satisfaction Survey",
    description: "General satisfaction survey for all patients",
    status: "active",
    responses: 128,
    createdAt: "2023-03-15",
    lastUpdated: "2023-04-10",
    averageRating: 4.2,
    completionRate: 78,
  },
  {
    id: "2",
    title: "Emergency Department Experience",
    description: "Feedback on emergency department visits",
    status: "active",
    responses: 64,
    createdAt: "2023-02-20",
    lastUpdated: "2023-04-05",
    averageRating: 3.8,
    completionRate: 65,
  },
  {
    id: "3",
    title: "Outpatient Services Feedback",
    description: "Survey for outpatient department services",
    status: "draft",
    responses: 0,
    createdAt: "2023-04-01",
    lastUpdated: "2023-04-01",
    averageRating: 0,
    completionRate: 0,
  },
  {
    id: "4",
    title: "Telemedicine Consultation Feedback",
    description: "Feedback on virtual consultations",
    status: "active",
    responses: 42,
    createdAt: "2023-03-10",
    lastUpdated: "2023-04-08",
    averageRating: 4.5,
    completionRate: 82,
  },
  {
    id: "5",
    title: "Post-Surgery Follow-up",
    description: "Feedback from patients after surgical procedures",
    status: "inactive",
    responses: 96,
    createdAt: "2023-01-15",
    lastUpdated: "2023-03-20",
    averageRating: 4.0,
    completionRate: 70,
  },
]

// Mock data for recent responses
const recentResponses = [
  {
    id: "r1",
    surveyId: "1",
    surveyTitle: "Patient Satisfaction Survey",
    patientName: "John Smith",
    submittedAt: "2023-04-15T14:30:00",
    rating: 5,
    comment: "The staff was very professional and caring. I felt well taken care of during my visit.",
    department: "General Medicine",
  },
  {
    id: "r2",
    surveyId: "2",
    surveyTitle: "Emergency Department Experience",
    patientName: "Maria Garcia",
    submittedAt: "2023-04-14T09:15:00",
    rating: 3,
    comment: "Wait time was too long, but the medical care was good once I was seen.",
    department: "Emergency",
  },
  {
    id: "r3",
    surveyId: "4",
    surveyTitle: "Telemedicine Consultation Feedback",
    patientName: "Robert Johnson",
    submittedAt: "2023-04-13T16:45:00",
    rating: 4,
    comment: "The video quality could be better, but the doctor was very thorough and helpful.",
    department: "Cardiology",
  },
  {
    id: "r4",
    surveyId: "1",
    surveyTitle: "Patient Satisfaction Survey",
    patientName: "Emily Wilson",
    submittedAt: "2023-04-12T11:20:00",
    rating: 5,
    comment: "Excellent service from start to finish. The new online check-in system is very convenient.",
    department: "Pediatrics",
  },
  {
    id: "r5",
    surveyId: "2",
    surveyTitle: "Emergency Department Experience",
    patientName: "David Chen",
    submittedAt: "2023-04-11T22:05:00",
    rating: 2,
    comment: "The emergency room was overcrowded and I had to wait for hours. The staff seemed overwhelmed.",
    department: "Emergency",
  },
]

// Feedback statistics
const feedbackStats = {
  totalSurveys: surveys.length,
  activeSurveys: surveys.filter((s) => s.status === "active").length,
  totalResponses: surveys.reduce((acc, survey) => acc + survey.responses, 0),
  averageRating: (
    surveys.reduce((acc, survey) => acc + survey.averageRating * survey.responses, 0) /
    surveys.reduce((acc, survey) => acc + survey.responses, 0)
  ).toFixed(1),
  completionRate: Math.round(
    surveys.reduce((acc, survey) => acc + survey.completionRate * survey.responses, 0) /
      surveys.reduce((acc, survey) => acc + survey.responses, 0),
  ),
}

// Department distribution
const departmentDistribution = [
  { name: "General Medicine", percentage: 35 },
  { name: "Emergency", percentage: 20 },
  { name: "Pediatrics", percentage: 15 },
  { name: "Cardiology", percentage: 12 },
  { name: "Orthopedics", percentage: 10 },
  { name: "Other", percentage: 8 },
]

export default function FeedbackPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter surveys based on search term and status
  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch =
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || survey.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground">Create and manage patient feedback surveys</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild size="sm">
            <Link href="/feedback/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Survey
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.totalSurveys}</div>
            <p className="text-xs text-muted-foreground">{feedbackStats.activeSurveys} active surveys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.totalResponses}</div>
            <p className="text-xs text-muted-foreground">From all surveys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.averageRating}/5</div>
            <p className="text-xs text-muted-foreground">Overall satisfaction score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Survey completion percentage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="surveys">
        <TabsList>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="responses">Recent Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search surveys..."
                  className="pl-8 w-[200px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredSurveys.length} of {surveys.length} surveys
            </div>
          </div>

          <div className="space-y-4">
            {filteredSurveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{survey.title}</CardTitle>
                      <CardDescription>{survey.description}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/feedback/${survey.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/feedback/${survey.id}/edit`}>
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            <span>Edit Survey</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/feedback/${survey.id}/responses`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>View Responses</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Survey</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Status</div>
                      <Badge
                        variant={
                          survey.status === "active" ? "default" : survey.status === "draft" ? "secondary" : "outline"
                        }
                      >
                        {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Responses</div>
                      <div>{survey.responses}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Average Rating</div>
                      <div className="flex items-center">
                        {survey.averageRating > 0 ? (
                          <>
                            {survey.averageRating.toFixed(1)}
                            <span className="text-yellow-500 ml-1">★</span>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span>{survey.completionRate}%</span>
                    </div>
                    <Progress value={survey.completionRate} className="h-2" />
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  Created on {new Date(survey.createdAt).toLocaleDateString()} • Last updated{" "}
                  {new Date(survey.lastUpdated).toLocaleDateString()}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4 mt-4">
          <div className="flex justify-between gap-3 flex-wrap items-center">
            <h3 className="text-lg font-medium">Recent Responses</h3>
            <Button variant="outline" size="sm" asChild>
              <Link href="/feedback/responses">View All Responses</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {recentResponses.map((response) => (
              <Card key={response.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between gap-3 flex-wrap items-start">
                    <div>
                      <CardTitle className="text-base">
                        Response to <span className="font-medium">{response.surveyTitle}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {new Date(response.submittedAt).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {response.department}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${star <= response.rating ? "text-yellow-500" : "text-gray-300"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">From {response.patientName}</div>
                    <p className="text-sm">{response.comment}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Reply
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-4">
          <DepartmentFeedbackChart />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingDistributionChart />
            <ResponseTrendChart />
          </div>

          <SentimentAnalysisChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}
