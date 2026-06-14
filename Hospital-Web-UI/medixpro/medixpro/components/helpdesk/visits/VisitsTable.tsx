"use client";

import { VisitRowActions } from "@/components/helpdesk/visits/VisitRowActions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HelpdeskVisitRow } from "@/lib/helpdesk/mapVisitListRow";
import {
  formatVisitDateTime,
  visitStatusLabel,
  visitTypeLabel,
} from "@/lib/helpdesk/mapVisitListRow";
import { cn } from "@/lib/utils";

type Props = {
  rows: HelpdeskVisitRow[];
  onRowOpen: (row: HelpdeskVisitRow) => void;
  onViewPrescription: (row: HelpdeskVisitRow) => void;
  onDownloadPrescription: (row: HelpdeskVisitRow) => void;
};

function patientSubline(row: HelpdeskVisitRow) {
  const parts: string[] = [];
  if (row.patientAge != null) parts.push(String(row.patientAge));
  if (row.patientGender) parts.push(row.patientGender);
  return parts.join(" · ");
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  const key = status.toUpperCase();
  if (key.includes("COMPLETED")) return "default";
  if (key.includes("PROGRESS")) return "secondary";
  return "outline";
}

export function VisitsTable({
  rows,
  onRowOpen,
  onViewPrescription,
  onDownloadPrescription,
}: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visit ID</TableHead>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rx</TableHead>
              <TableHead>Tests</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.visitId}
                className="cursor-pointer"
                onClick={() => onRowOpen(row)}
              >
                <TableCell className="font-mono text-xs">{row.visitPnr}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatVisitDateTime(row.startedAt)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.patientName}</div>
                  <div className="text-xs text-muted-foreground">{patientSubline(row)}</div>
                </TableCell>
                <TableCell className="text-sm">{row.patientMobile || "—"}</TableCell>
                <TableCell className="text-sm">{row.doctorName}</TableCell>
                <TableCell className="text-sm">{visitTypeLabel(row.visitType)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{visitStatusLabel(row.status)}</Badge>
                </TableCell>
                <TableCell className="text-sm">{row.hasPrescription ? "Yes" : "No"}</TableCell>
                <TableCell className="text-sm">{row.testsCount}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <VisitRowActions
                    row={row}
                    onView={() => onRowOpen(row)}
                    onViewPrescription={() => onViewPrescription(row)}
                    onDownloadPrescription={() => onDownloadPrescription(row)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <button
            key={row.visitId}
            type="button"
            className={cn(
              "w-full rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm",
              "transition-colors hover:bg-muted/30",
            )}
            onClick={() => onRowOpen(row)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.patientName}</p>
                <p className="text-xs text-muted-foreground">{row.visitPnr}</p>
              </div>
              <Badge variant={statusVariant(row.status)}>{visitStatusLabel(row.status)}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">When</dt>
                <dd>{formatVisitDateTime(row.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Doctor</dt>
                <dd>{row.doctorName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd>{visitTypeLabel(row.visitType)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tests</dt>
                <dd>{row.testsCount}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </>
  );
}
