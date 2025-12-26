"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Save, X } from "lucide-react"

interface SimpleFormCardProps {
  title: string
  description?: string
  children: React.ReactNode
  isEditing?: boolean
  onEdit?: () => void
  onSave?: () => void
  onCancel?: () => void
  isSaving?: boolean
}

export function SimpleFormCard({
  title,
  description,
  children,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
}: SimpleFormCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </div>
        <div className="flex gap-2">
          {!isEditing && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 bg-transparent">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
                className="gap-2 bg-transparent"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
