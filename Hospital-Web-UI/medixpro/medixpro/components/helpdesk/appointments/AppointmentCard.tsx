"use client";

import { CalendarClock, Stethoscope, User } from "lucide-react";

import type { Appointment, AppointmentStatus } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusLabel: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  checked_in: "Checked in",
  no_show: "No show",
  in_consultation: "In consultation",
};

const statusClass: Record<AppointmentStatus, string> = {
  scheduled: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  completed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  cancelled: "bg-muted text-muted-foreground",
  checked_in: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
  no_show: "bg-muted text-muted-foreground",
  in_consultation: "bg-violet-500/15 text-violet-900 dark:text-violet-100",
};

export interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onCheckIn: (a: Appointment) => void;
  actionDisabled?: boolean;
  className?: string;
}

export function AppointmentCard({
  appointment: a,
  onReschedule,
  onCancel,
  onCheckIn,
  actionDisabled,
  className,
}: AppointmentCardProps) {
  const canReschedule = a.status === "scheduled";
  const canCancel = a.status === "scheduled";
  const canCheckIn = a.status === "scheduled";

  return (
    <article
      className={cn(
        "rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{a.patientName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stethoscope className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{a.doctorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {a.appointmentDate} · {a.appointmentTime}
            </span>
            <span className="text-xs">· {a.consultationMode === "video" ? "Video" : "Clinic"}</span>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusClass[a.status]
          )}
        >
          {statusLabel[a.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canCheckIn && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={actionDisabled}
            onClick={() => onCheckIn(a)}
          >
            Check-in
          </Button>
        )}
        {canReschedule && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={actionDisabled}
            onClick={() => onReschedule(a)}
          >
            Reschedule
          </Button>
        )}
        {canCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionDisabled}
            onClick={() => onCancel(a)}
          >
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}
