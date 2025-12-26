"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface ProfileProgressCardProps {
  totalProgress: number
  sectionProgress: Record<string, number>
  pendingSections: string[]
}

export function ProfileProgressCard({ totalProgress, sectionProgress, pendingSections }: ProfileProgressCardProps) {
  const sections = [
    { key: "personal", label: "Personal Info" },
    { key: "address", label: "Address" },
    { key: "professional", label: "Professional" },
    { key: "kyc", label: "KYC" },
    { key: "clinic", label: "Clinics" },
    { key: "fees", label: "Fees" },
    { key: "services", label: "Services" },
    { key: "bank", label: "Bank" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Profile Completion
          <span className="text-2xl font-bold text-primary">{totalProgress}%</span>
        </CardTitle>
        <CardDescription>Complete your profile to unlock all features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={totalProgress} className="h-3" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sections.map((section) => {
            const progress = sectionProgress[section.key] || 0
            const isComplete = progress === 100

            return (
              <div key={section.key} className="flex items-center gap-2 text-sm">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              </div>
            )
          })}
        </div>

        {pendingSections.length > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-sm font-medium text-warning mb-2">Pending Sections:</p>
            <div className="flex flex-wrap gap-2">
              {pendingSections.map((section, index) => (
                <Badge key={index} variant="outline" className="border-warning/30 text-warning">
                  {section}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
