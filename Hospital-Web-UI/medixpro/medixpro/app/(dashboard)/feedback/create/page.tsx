"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "rating"

interface QuestionOption {
  id: string
  text: string
}

interface Question {
  id: string
  type: QuestionType
  question: string
  required: boolean
  options: QuestionOption[]
}

// Question types
const questionTypes = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "radio", label: "Single Choice" },
  { value: "checkbox", label: "Multiple Choice" },
  { value: "rating", label: "Rating" },
] as const

export default function CreateSurveyPage() {
  const [surveyTitle, setSurveyTitle] = useState("")
  const [surveyDescription, setSurveyDescription] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", type: "text", question: "", required: true, options: [] }
  ])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      type: "text",
      question: "",
      required: true,
      options: [],
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string, field: keyof Question, value: Question[keyof Question]) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, { id: `opt${q.options.length + 1}`, text: "" }] } : q,
      ),
    )
  }

  const updateOption = (questionId: string, optionId: string, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) => (opt.id === optionId ? { ...opt, text: value } : opt)),
            }
          : q,
      ),
    )
  }

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((opt) => opt.id !== optionId),
            }
          : q,
      ),
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically save the survey to your backend
    console.log({
      title: surveyTitle,
      description: surveyDescription,
      isActive,
      questions,
    })
    // Then redirect to the surveys list
    // router.push('/feedback')
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/feedback">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Create New Survey</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
            <CardDescription>Basic information about your survey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title</Label>
              <Input
                id="title"
                placeholder="Enter survey title"
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter survey description"
                value={surveyDescription}
                onChange={(e) => setSurveyDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="active">Activate survey immediately</Label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Survey Questions</h2>
            <Button type="button" onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(question.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove question</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${question.id}`}>Question Text</Label>
                    <Input
                      id={`question-${question.id}`}
                      placeholder="Enter your question"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, "question", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`type-${question.id}`}>Question Type</Label>
                    <Select value={question.type} onValueChange={(value) => updateQuestion(question.id, "type", value)}>
                      <SelectTrigger id={`type-${question.id}`}>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        {questionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`required-${question.id}`}
                    checked={question.required}
                    onCheckedChange={(checked) => updateQuestion(question.id, "required", checked)}
                  />
                  <Label htmlFor={`required-${question.id}`}>Required question</Label>
                </div>

                {(question.type === "radio" || question.type === "checkbox") && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Options</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addOption(question.id)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    </div>

                    {question.options.length === 0 && (
                      <p className="text-sm text-muted-foreground">No options added yet. Add at least one option.</p>
                    )}

                    {question.options.map((option, optIndex) => (
                      <div key={option.id} className="flex items-center gap-2">
                        {question.type === "radio" ? (
                          <RadioGroup defaultValue="default">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="default" id={`radio-${option.id}`} disabled />
                            </div>
                          </RadioGroup>
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-sm border border-primary"></div>
                        )}
                        <Input
                          placeholder={`Option ${optIndex + 1}`}
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(question.id, option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove option</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "rating" && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-2xl text-gray-300 cursor-not-allowed">
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/feedback">Cancel</Link>
          </Button>
          <Button type="submit">Create Survey</Button>
        </div>
      </form>
    </div>
  )
}
