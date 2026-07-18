"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ScheduleAppointmentRow = {
  id: string;
  patientId: string;
  time: string;
  patientName: string;
  type: string;
  status: string;
};

const statusBadgeClass: Record<string, string> = {
  Completed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  Waiting: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
  "Vitals Done": "bg-sky-500/15 text-sky-900 dark:text-sky-100",
  "In Progress": "bg-violet-500/15 text-violet-900 dark:text-violet-100",
  Scheduled: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  Cancelled: "bg-muted text-muted-foreground",
  "No Show": "bg-muted text-muted-foreground",
};

type DoctorScheduleAppointmentsListProps = {
  appointments: ScheduleAppointmentRow[];
  totalAppointments?: number;
  loading?: boolean;
  onViewPatient?: (appointment: ScheduleAppointmentRow) => void;
  onStartConsultation?: (appointment: ScheduleAppointmentRow) => void;
};

export function DoctorScheduleAppointmentsList({
  appointments,
  totalAppointments,
  loading,
  onViewPatient,
  onStartConsultation,
}: DoctorScheduleAppointmentsListProps) {
  const count = totalAppointments ?? appointments.length;

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-2xl font-semibold">Today&apos;s Appointments</CardTitle>
        <CardDescription className="text-sm">
          {loading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <>
              {count} scheduled consultation{count === 1 ? "" : "s"}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-6 pt-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))
        ) : appointments.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No appointments scheduled today.
          </p>
        ) : (
          appointments.map((appointment) => {
            const canOpenPatient = Boolean(appointment.patientId) && Boolean(onViewPatient);
            const canStart =
              Boolean(appointment.patientId) &&
              Boolean(onStartConsultation) &&
              (appointment.status === "Waiting" ||
                appointment.status === "Vitals Done" ||
                appointment.status === "Scheduled" ||
                appointment.status === "In Progress");

            return (
              <div
                key={appointment.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors",
                  canOpenPatient && "hover:bg-muted/40"
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-1 flex-wrap items-center gap-3 text-left",
                    canOpenPatient ? "cursor-pointer" : "cursor-default"
                  )}
                  onClick={() => {
                    if (canOpenPatient) onViewPatient?.(appointment);
                  }}
                  disabled={!canOpenPatient}
                  aria-label={
                    canOpenPatient
                      ? `View patient ${appointment.patientName}`
                      : `Appointment for ${appointment.patientName}`
                  }
                >
                  <span className="w-[88px] shrink-0 font-semibold tabular-nums text-foreground">
                    {appointment.time}
                  </span>
                  <span className="min-w-[120px] flex-1 font-medium">{appointment.patientName}</span>
                  <span className="text-muted-foreground">{appointment.type}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-normal",
                      statusBadgeClass[appointment.status] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {appointment.status}
                  </Badge>
                </button>
                {canStart ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onStartConsultation?.(appointment)}
                  >
                    Start
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
