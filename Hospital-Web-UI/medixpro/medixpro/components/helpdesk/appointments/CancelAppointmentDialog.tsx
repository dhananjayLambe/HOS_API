"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";

export interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onConfirm,
  isLoading,
}: CancelAppointmentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            {appointment ? (
              <>
                This will cancel the booking for{" "}
                <strong className="text-foreground">{appointment.patientName}</strong> on{" "}
                {appointment.appointmentDate} at {appointment.appointmentTime}. You can add an optional
                reason in a future release.
              </>
            ) : (
              "No appointment selected."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading || !appointment}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancelling…" : "Cancel appointment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
