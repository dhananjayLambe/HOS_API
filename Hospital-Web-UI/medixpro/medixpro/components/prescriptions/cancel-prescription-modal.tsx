"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const reasonOptions = [
  "Wrong patient selected",
  "Incorrect medicine added",
  "Duplicate consultation",
  "Consultation entered by mistake",
  "Doctor requested cancellation",
  "Other",
] as const;

interface CancelPrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, reasonText?: string) => void;
  isSubmitting?: boolean;
}

export function CancelPrescriptionModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: CancelPrescriptionModalProps) {
  const [reason, setReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const requiresOther = reason === "Other";
  const canSubmit = useMemo(() => {
    if (!reason) return false;
    if (!requiresOther) return true;
    return Boolean(otherReason.trim());
  }, [reason, requiresOther, otherReason]);

  useEffect(() => {
    if (!open) {
      setReason("");
      setOtherReason("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel Prescription?</DialogTitle>
          <DialogDescription>
            This prescription may already have been downloaded or shared with the patient. Cancelling will mark this prescription as invalid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason} disabled={isSubmitting}>
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Select cancellation reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresOther ? (
            <div className="space-y-2">
              <Label htmlFor="cancel-other-reason">Other reason</Label>
              <Textarea
                id="cancel-other-reason"
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                placeholder="Provide cancellation reason"
                disabled={isSubmitting}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Keep Prescription
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || isSubmitting}
            onClick={() => onConfirm(reason, requiresOther ? otherReason.trim() : "")}
          >
            {isSubmitting ? "Cancelling..." : "Cancel Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
