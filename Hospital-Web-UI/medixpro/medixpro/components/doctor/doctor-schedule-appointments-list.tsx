"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ScheduleAppointmentRow = {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: string;
};

const statusBadgeClass: Record<string, string> = {
  Completed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  Waiting: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
  "In Progress": "bg-violet-500/15 text-violet-900 dark:text-violet-100",
  Scheduled: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  Cancelled: "bg-muted text-muted-foreground",
  "No Show": "bg-muted text-muted-foreground",
};

type DoctorScheduleAppointmentsListProps = {
  appointments: ScheduleAppointmentRow[];
  scheduledCount?: number;
};

export function DoctorScheduleAppointmentsList({
  appointments,
  scheduledCount,
}: DoctorScheduleAppointmentsListProps) {
  const count = scheduledCount ?? appointments.length;

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-2xl font-semibold">Today&apos;s Appointments</CardTitle>
        <CardDescription className="text-sm">
          {count} scheduled consultation{count === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-6 pt-0">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <span className="w-[88px] shrink-0 font-semibold tabular-nums text-foreground">
              {appointment.time}
            </span>
            <span className="min-w-[120px] flex-1 font-medium">{appointment.patientName}</span>
            <span className="text-muted-foreground">{appointment.type}</span>
            <Badge
              variant="secondary"
              className={cn(
                "ml-auto font-normal",
                statusBadgeClass[appointment.status] ?? "bg-muted text-muted-foreground"
              )}
            >
              {appointment.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
