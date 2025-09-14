"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  MessageSquare,
  Share2,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  settings: {
    allowAnonymous: true,
    notifyOnResponse: true,
    autoClose: false,
    autoCloseDate: null,
    thankYouMessage: "Thank you for your feedback! We appreciate your time.",
  },
  distribution: {
    email: true,
    sms: false,
    qrCode: true,
    link: true,
  },
}

// Mock data for recent responses
const recentResponses = [
  {
    id: "r1",
    patientName: "John Smith",
    submittedAt: "2023-04-15T14:30:00",
    rating: 5,
    comment: "The staff was very professional and caring. I felt well taken care of during my visit.",
    department: "General Medicine",
  },
  {
    id: "r2",
    patientName: "Maria Garcia",
    submittedAt: "2023-04-14T09:15:00",
    rating: 3,
    comment: "Wait time was too long, but the medical care was good once I was seen.",
    department: "Emergency",
  },
  {
    id: "r3",
    patientName: "Robert Johnson",
    submittedAt: "2023-04-13T16:45:00",
    rating: 4,
    comment: "The video quality could be better, but the doctor was very thorough and helpful.",
    department: "Cardiology",
  },
]

export default function FeedbackDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const surveyId = params.id as string

  // Function to handle survey deletion
  const handleDeleteSurvey = () => {
    // In a real app, this would call an API to delete the survey
    console.log(`Deleting survey ${surveyId}`)
    setDeleteDialogOpen(false)
    router.push("/feedback")
  }

  // Function to copy survey link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://clinic-dashboard.com/s/${surveyId}`)
    // In a real app, you would show a toast notification here
    console.log("Survey link copied to clipboard")
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/feedback">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
            <p className="text-muted-foreground">{survey.description}</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/feedback/${surveyId}/responses`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Responses
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/feedback/${surveyId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Overview</CardTitle>
              <CardDescription>View and manage your survey details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    {survey.averageRating.toFixed(1)}
                    <span className="text-yellow-500 ml-1">★</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span>{survey.completionRate}%</span>
                </div>
                <Progress value={survey.completionRate} className="h-2" />
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Survey Questions</h3>
                <div className="space-y-4">
                  {survey.questions.map((question, index) => (
                    <div key={question.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {index + 1}. {question.text}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Type: {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                            {question.required && " • Required"}
                          </div>
                        </div>
                      </div>
                      {question.options && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option, i) => (
                            <div key={i} className="text-sm pl-4">
                              • {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Created on {new Date(survey.createdAt).toLocaleDateString()} • Last updated{" "}
              {new Date(survey.lastUpdated).toLocaleDateString()}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Responses</CardTitle>
              <CardDescription>Latest feedback from patients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentResponses.map((response) => (
                  <div key={response.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{response.patientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(response.submittedAt).toLocaleString()} • {response.department}
                        </div>
                      </div>
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
                    <p className="mt-2 text-sm">{response.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/feedback/${surveyId}/responses`}>View All Responses</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Settings</CardTitle>
              <CardDescription>Configure your survey options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous">Allow Anonymous Responses</Label>
                  <p className="text-sm text-muted-foreground">Let patients submit without identification</p>
                </div>
                <Switch id="anonymous" checked={survey.settings.allowAnonymous} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify">Notify on New Response</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for new responses</p>
                </div>
                <Switch id="notify" checked={survey.settings.notifyOnResponse} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoclose">Auto-close Survey</Label>
                  <p className="text-sm text-muted-foreground">Automatically close survey after a date</p>
                </div>
                <Switch id="autoclose" checked={survey.settings.autoClose} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution Methods</CardTitle>
              <CardDescription>How patients can access your survey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={survey.distribution.email ? "default" : "outline"}>Email</Badge>
                <Badge variant={survey.distribution.sms ? "default" : "outline"}>SMS</Badge>
                <Badge variant={survey.distribution.qrCode ? "default" : "outline"}>QR Code</Badge>
                <Badge variant={survey.distribution.link ? "default" : "outline"}>Direct Link</Badge>
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertTitle>Survey Link</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">https://clinic-dashboard.com/s/{surveyId}</code>
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Destructive actions for your survey</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Survey
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this survey?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the survey and all its responses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSurvey}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Survey</DialogTitle>
            <DialogDescription>Share this survey with patients through various channels</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Survey Link</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                  https://clinic-dashboard.com/s/{surveyId}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Email
              </Button>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Patient List
              </Button>
              <Button variant="outline" className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                Auto-send
              </Button>
              <Button variant="outline" className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                After Visit
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
