"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddNoteModalProps {
  isOpen: boolean
  onClose: () => void
  staffMember: {
    id: number
    name: string
  }
  onSave: (data: { noteType: string; note: string }) => void
}

export function AddNoteModal({ isOpen, onClose, staffMember, onSave }: AddNoteModalProps) {
  const handleSave = () => {
    const noteType = (document.getElementById("note-type") as HTMLSelectElement).value
    const note = (document.getElementById("note") as HTMLTextAreaElement).value

    onSave({ noteType, note })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Attendance Note</DialogTitle>
          <DialogDescription>Add a note to {staffMember.name}'s attendance record.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note-type">Note Type</Label>
            <Select defaultValue="general">
              <SelectTrigger id="note-type">
                <SelectValue placeholder="Select note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Note</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" placeholder="Enter your note here" rows={4} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select defaultValue="management">
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="management">Management Only</SelectItem>
                <SelectItem value="hr">HR Department</SelectItem>
                <SelectItem value="employee">Employee & Management</SelectItem>
                <SelectItem value="all">All Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
