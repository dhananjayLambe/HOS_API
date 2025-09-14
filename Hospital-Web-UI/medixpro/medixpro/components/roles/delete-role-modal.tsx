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
import { AlertTriangle } from "lucide-react"

interface DeleteRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
  onConfirm: () => void
}

export function DeleteRoleModal({ open, onOpenChange, roleName, onConfirm }: DeleteRoleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Delete {roleName} Role</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete this role? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            <h4 className="mb-2 font-medium">Warning: This action has consequences</h4>
            <ul className="ml-4 list-disc text-sm">
              <li className="mb-1">All users currently assigned to this role will lose these permissions</li>
              <li className="mb-1">Any automated workflows or access controls using this role will be affected</li>
              <li>Historical records will maintain a reference to this deleted role</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
