"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  label: string
  accept?: string
  maxSize?: number
  onFileSelect: (file: File | null) => void
  currentFile?: string
  disabled?: boolean
}

export function FileUpload({
  label,
  accept = "image/*,.pdf",
  maxSize = 5 * 1024 * 1024, // 5MB default
  onFileSelect,
  currentFile,
  disabled = false,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentFile || null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
      return
    }

    setError(null)
    onFileSelect(file)

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(file.name)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onFileSelect(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {!preview ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => document.getElementById(`file-${label}`)?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
          <input
            id={`file-${label}`}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          {typeof preview === "string" && preview.startsWith("data:") ? (
            <img src={preview || "/placeholder.svg"} alt="Preview" className="h-10 w-10 rounded object-cover" />
          ) : (
            <FileText className="h-10 w-10 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-sm">{preview}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
