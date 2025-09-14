"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Mock data for the survey
const initialSurvey = {
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

export default function FeedbackEditPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState({ ...initialSurvey })
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)

  // Function to update survey title and description
  const updateSurveyDetails = (field: string, value: string) => {
    setSurvey((prev) => ({ ...prev, [field]: value }))
    setUnsavedChanges(true)
  }

  // Function to update survey settings
  const updateSurveySettings = (field: string, value: boolean | string) => {
    setSurvey((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }))
    setUnsavedChanges(true)
  }

  // Function to update survey distribution methods
  const updateDistribution = (method: string, value: boolean) => {
    setSurvey((prev) => ({
      ...prev,
      distribution: {
        ...prev.distribution,
        [method]: value,
      },
    }))
    setUnsavedChanges(true)
  }

  // Function to update question text
  const updateQuestionText = (questionId: string, text: string) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, text } : q)),
    }))
    setUnsavedChanges(true)
  }

  // Function to update question type
  const updateQuestionType = (questionId: string, type: string) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          // If changing to a type that needs options and there are none
          if ((type === "multiple-choice" || type === "rating") && (!q.options || q.options.length === 0)) {
            return {
              ...q,
              type,
              options: type === "rating" ? ["1", "2", "3", "4", "5"] : ["Option 1", "Option 2", "Option 3"],
            }
          }
          // If changing to a type that doesn't need options
          if (type === "text" && q.options) {
            const { options, ...rest } = q
            return { ...rest, type }
          }
          return { ...q, type }
        }
        return q
      }),
    }))
    setUnsavedChanges(true)
  }

  // Function to update question required status
  const updateQuestionRequired = (questionId: string, required: boolean) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, required } : q)),
    }))
    setUnsavedChanges(true)
  }

  // Function to update question options
  const updateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = value
          return { ...q, options: newOptions }
        }
        return q
      }),
    }))
    setUnsavedChanges(true)
  }

  // Function to add a new option to a question
  const addQuestionOption = (questionId: string) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId && q.options) {
          return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
        }
        return q
      }),
    }))
    setUnsavedChanges(true)
  }

  // Function to remove an option from a question
  const removeQuestionOption = (questionId: string, optionIndex: number) => {
    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId && q.options && q.options.length > 1) {
          const newOptions = [...q.options]
          newOptions.splice(optionIndex, 1)
          return { ...q, options: newOptions }
        }
        return q
      }),
    }))
    setUnsavedChanges(true)
  }

  // Function to add a new question
  const addQuestion = () => {
    const newQuestion = {
      id: `q${Date.now()}`,
      type: "text",
      required: false,
      text: "New Question",
    }
    setSurvey((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }))
    setUnsavedChanges(true)
  }

  // Function to delete a question
  const deleteQuestion = (questionId: string) => {
    setQuestionToDelete(questionId)
    setDeleteQuestionDialogOpen(true)
  }

  // Function to confirm question deletion
  const confirmDeleteQuestion = () => {
    if (questionToDelete) {
      setSurvey((prev) => ({
        ...prev,
        questions: prev.questions.filter((q) => q.id !== questionToDelete),
      }))
      setUnsavedChanges(true)
    }
    setDeleteQuestionDialogOpen(false)
    setQuestionToDelete(null)
  }

  // Function to save survey changes
  const saveSurvey = () => {
    // In a real app, this would call an API to save the survey
    console.log("Saving survey:", survey)
    setUnsavedChanges(false)
    router.push(`/feedback/${surveyId}`)
  }

  // Function to handle discard changes
  const handleDiscard = () => {
    if (unsavedChanges) {
      setDiscardDialogOpen(true)
    } else {
      router.push(`/feedback/${surveyId}`)
    }
  }

  // Function to confirm discard changes
  const confirmDiscard = () => {
    setDiscardDialogOpen(false)
    router.push(`/feedback/${surveyId}`)
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={handleDiscard}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Survey</h1>
            <p className="text-muted-foreground">Modify your survey questions and settings</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDiscard}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveSurvey}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Details</CardTitle>
              <CardDescription>Basic information about your survey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Survey Title</Label>
                <Input id="title" value={survey.title} onChange={(e) => updateSurveyDetails("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={survey.description}
                  onChange={(e) => updateSurveyDetails("description", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={survey.status} onValueChange={(value) => updateSurveyDetails("status", value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Survey Questions</CardTitle>
              <CardDescription>Edit or add questions to your survey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {survey.questions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-md space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2">
                      Question {index + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(question.id)}
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-${question.id}`}>Question Text</Label>
                    <Input
                      id={`question-${question.id}`}
                      value={question.text}
                      onChange={(e) => updateQuestionText(question.id, e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`type-${question.id}`}>Question Type</Label>
                      <Select value={question.type} onValueChange={(value) => updateQuestionType(question.id, value)}>
                        <SelectTrigger id={`type-${question.id}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Response</SelectItem>
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`required-${question.id}`}
                        checked={question.required}
                        onCheckedChange={(checked) => updateQuestionRequired(question.id, checked)}
                      />
                      <Label htmlFor={`required-${question.id}`}>Required Question</Label>
                    </div>
                  </div>

                  {question.options && (
                    <div className="space-y-3 mt-4">
                      <Label>Options</Label>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                            className="flex-1"
                          />
                          {question.options && question.options.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestionOption(question.id, optionIndex)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestionOption(question.id)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addQuestion} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
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
                <Switch
                  id="anonymous"
                  checked={survey.settings.allowAnonymous}
                  onCheckedChange={(checked) => updateSurveySettings("allowAnonymous", checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify">Notify on New Response</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for new responses</p>
                </div>
                <Switch
                  id="notify"
                  checked={survey.settings.notifyOnResponse}
                  onCheckedChange={(checked) => updateSurveySettings("notifyOnResponse", checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoclose">Auto-close Survey</Label>
                  <p className="text-sm text-muted-foreground">Automatically close survey after a date</p>
                </div>
                <Switch
                  id="autoclose"
                  checked={survey.settings.autoClose}
                  onCheckedChange={(checked) => updateSurveySettings("autoClose", checked)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="thankYouMessage">Thank You Message</Label>
                <Textarea
                  id="thankYouMessage"
                  value={survey.settings.thankYouMessage}
                  onChange={(e) => updateSurveySettings("thankYouMessage", e.target.value as string)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution Methods</CardTitle>
              <CardDescription>How patients can access your survey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-dist">Email Distribution</Label>
                <Switch
                  id="email-dist"
                  checked={survey.distribution.email}
                  onCheckedChange={(checked) => updateDistribution("email", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-dist">SMS Distribution</Label>
                <Switch
                  id="sms-dist"
                  checked={survey.distribution.sms}
                  onCheckedChange={(checked) => updateDistribution("sms", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="qr-dist">QR Code Distribution</Label>
                <Switch
                  id="qr-dist"
                  checked={survey.distribution.qrCode}
                  onCheckedChange={(checked) => updateDistribution("qrCode", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="link-dist">Direct Link Distribution</Label>
                <Switch
                  id="link-dist"
                  checked={survey.distribution.link}
                  onCheckedChange={(checked) => updateDistribution("link", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discard Changes Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>You have unsaved changes that will be lost if you leave this page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={confirmDiscard}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question Dialog */}
      <Dialog open={deleteQuestionDialogOpen} onOpenChange={setDeleteQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>This will permanently remove this question from your survey.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteQuestion}>
              Delete Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
