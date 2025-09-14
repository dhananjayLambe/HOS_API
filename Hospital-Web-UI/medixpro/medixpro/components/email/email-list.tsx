"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Archive, AlertCircle, Star, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

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

interface EmailListProps {
  emails: Email[]
  selectedEmails: string[]
  onSelectEmail: (emailId: string) => void
  onArchive: () => void
  onDelete: () => void
  onStar: () => void
  onMarkImportant: () => void
}

export function EmailList({
  emails,
  selectedEmails,
  onSelectEmail,
  onArchive,
  onDelete,
  onStar,
  onMarkImportant,
}: EmailListProps) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  const toggleExpand = (emailId: string) => {
    setExpandedEmail(expandedEmail === emailId ? null : emailId)
  }

  if (emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium">No emails found</h3>
          <p className="text-sm text-muted-foreground">
            There are no emails in this folder or matching your search criteria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {emails.map((email) => (
        <div
          key={email.id}
          className={cn("group flex flex-col p-2 lg:p-4 transition-colors hover:bg-muted/50", !email.read && "bg-muted/30")}
        >
          <div className="flex items-start flex-wrap gap-4">
            <Checkbox
              checked={selectedEmails.includes(email.id)}
              onCheckedChange={() => onSelectEmail(email.id)}
              className="mt-1"
            />
            <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(email.id)}>
              <div className="flex items-center gap-3 flex-wrap justify-between">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="font-medium">
                    {email.folder === "sent" || email.folder === "draft" ? `To: ${email.to}` : email.from}
                  </div>
                  {email.important && <AlertCircle className="h-4 w-4 text-amber-500" />}
                  {email.starred && <Star className="h-4 w-4 text-yellow-500" />}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                </div>
              </div>
              <div className="text-base font-medium">{email.subject}</div>
              <div className="line-clamp-2 text-sm text-muted-foreground">{email.body}</div>
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectEmail(email.id)
                  onStar()
                }}
                className="rounded-full p-1 hover:bg-muted"
              >
                <Star
                  className={cn("h-4 w-4", email.starred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")}
                />
                <span className="sr-only">Star</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectEmail(email.id)
                  onArchive()
                }}
                className="rounded-full p-1 hover:bg-muted"
              >
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Archive</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectEmail(email.id)
                  onDelete()
                }}
                className="rounded-full p-1 hover:bg-muted"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Delete</span>
              </button>
            </div>
          </div>
          {expandedEmail === email.id && (
            <div className="mt-4 rounded-md border p-4">
              <div className="mb-2 flex items-center gap-3 flex-wrap justify-between">
                <div>
                  <div className="font-medium">
                    {email.folder === "sent" || email.folder === "draft" ? `To: ${email.to}` : `From: ${email.from}`}
                  </div>
                  {email.folder === "sent" || email.folder === "draft" ? (
                    <div className="text-sm text-muted-foreground">From: {email.from}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">To: {email.to}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{new Date(email.date).toLocaleString()}</div>
              </div>
              <div className="mb-4 text-lg font-medium">{email.subject}</div>
              <div className="whitespace-pre-wrap text-sm">{email.body}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
