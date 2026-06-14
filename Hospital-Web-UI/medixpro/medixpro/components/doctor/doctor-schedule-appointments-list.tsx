"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ScheduleAppointmentRow = {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: string;
};

const statusBadgeClass: Record<string, string> = {
  Completed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/15",
  Waiting: "bg-sky-500/15 text-sky-900 dark:text-sky-100 hover:bg-sky-500/15",
  "In Progress": "bg-violet-500/15 text-violet-900 dark:text-violet-100 hover:bg-violet-500/15",
  Scheduled: "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  Cancelled: "bg-muted text-muted-foreground hover:bg-muted",
  "No Show": "bg-muted text-muted-foreground hover:bg-muted",
};

type DoctorScheduleAppointmentsListProps = {
  appointments: ScheduleAppointmentRow[];
};

export function DoctorScheduleAppointmentsList({ appointments }: DoctorScheduleAppointmentsListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Today&apos;s Appointments</CardTitle>
        <CardDescription>Chronological list of today&apos;s consultations</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="font-medium tabular-nums">{appointment.time}</TableCell>
                <TableCell>{appointment.patientName}</TableCell>
                <TableCell className="text-muted-foreground">{appointment.type}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-normal",
                      statusBadgeClass[appointment.status] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {appointment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
