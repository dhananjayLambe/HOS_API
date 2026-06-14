"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { cn } from "@/lib/utils";

type Props = {
  rows: Appointment[];
  checkingInId?: string | null;
  onCheckIn?: (row: Appointment) => void;
  actionDisabled?: boolean;
  className?: string;
};

function formatDateTime(date: string, time: string) {
  if (!date) return "—";
  const d = new Date(`${date}T${time || "00:00:00"}`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(a: Appointment) {
  if (a.appointmentType === "follow_up") return "Follow Up";
  return "Appointment";
}

function statusBadge(row: Appointment) {
  if (row.status === "checked_in") {
    return <Badge className="bg-sky-500/15 text-sky-900 dark:text-sky-100">Checked in</Badge>;
  }
  if (row.status === "in_consultation") {
    return <Badge className="bg-violet-500/15 text-violet-900 dark:text-violet-100">In consultation</Badge>;
  }
  if (row.isOverdue) {
    return <Badge variant="destructive">Overdue</Badge>;
  }
  return <Badge variant="secondary">Scheduled</Badge>;
}

function RowActions({
  row,
  checkingInId,
  onCheckIn,
  actionDisabled,
}: {
  row: Appointment;
  checkingInId?: string | null;
  onCheckIn?: (row: Appointment) => void;
  actionDisabled?: boolean;
}) {
  const isChecking = checkingInId === row.id;
  const canCheckIn = row.status === "scheduled" && Boolean(onCheckIn);
  const inQueue = row.status === "checked_in" || row.status === "in_consultation";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {inQueue ? (
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link href="/helpdesk/queue">Open queue</Link>
        </Button>
      ) : null}
      {canCheckIn ? (
        <Button
          type="button"
          size="sm"
          disabled={actionDisabled || isChecking}
          onClick={() => onCheckIn?.(row)}
        >
          {isChecking ? "Checking…" : "Check-in"}
        </Button>
      ) : null}
    </div>
  );
}

export function UpcomingAppointmentsTable({
  rows,
  checkingInId,
  onCheckIn,
  actionDisabled,
  className,
}: Props) {
  return (
    <>
      <div className={cn("hidden overflow-x-auto md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDateTime(row.appointmentDate, row.appointmentTime)}
                </TableCell>
                <TableCell className="font-medium">{row.patientName}</TableCell>
                <TableCell className="text-sm">{row.doctorName}</TableCell>
                <TableCell className="text-sm">{typeLabel(row)}</TableCell>
                <TableCell className="text-sm capitalize">
                  {row.consultationMode === "video" ? "Video" : "Clinic"}
                </TableCell>
                <TableCell>{statusBadge(row)}</TableCell>
                <TableCell className="text-right">
                  <RowActions
                    row={row}
                    checkingInId={checkingInId}
                    onCheckIn={onCheckIn}
                    actionDisabled={actionDisabled}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className={cn("space-y-3 md:hidden", className)}>
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-border/80 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{row.patientName}</p>
              {statusBadge(row)}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">When</dt>
                <dd>{formatDateTime(row.appointmentDate, row.appointmentTime)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Doctor</dt>
                <dd>{row.doctorName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd>{typeLabel(row)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mode</dt>
                <dd className="capitalize">{row.consultationMode === "video" ? "Video" : "Clinic"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <RowActions
                row={row}
                checkingInId={checkingInId}
                onCheckIn={onCheckIn}
                actionDisabled={actionDisabled}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
