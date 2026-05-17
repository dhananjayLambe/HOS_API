"use client";

import { VisitAppointmentRowActions } from "@/components/labs/visit-appointments/VisitAppointmentRowActions";
import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { labTableCellBody } from "@/components/labs/labDesignTokens";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrepNotesDisplay } from "@/lib/labs/visit-appointments/format-prep-notes";
import {
  appointmentStatusDisplayLabel,
} from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

type Props = {
  rows: LabAppointmentRow[];
  busyId?: string | null;
  onRowOpen: (row: LabAppointmentRow) => void;
  onConfirm: (row: LabAppointmentRow) => void;
  onCheckIn: (row: LabAppointmentRow) => void;
  onComplete: (row: LabAppointmentRow) => void;
  onMarkNoShow: (row: LabAppointmentRow) => void;
};

function patientSubline(row: LabAppointmentRow) {
  const parts: string[] = [];
  if (row.patientAge != null) parts.push(String(row.patientAge));
  if (row.patientGender) parts.push(row.patientGender);
  return parts.join(" · ");
}

function testsCell(row: LabAppointmentRow) {
  const names = row.testNames.join(", ");
  const more = row.testNamesOverflow > 0 ? ` +${row.testNamesOverflow} more` : "";
  return (
    <div className="max-w-[160px]">
      <p className="text-xs font-medium text-[#6B7280]">{row.testCount} Tests</p>
      <p className={cn("truncate text-sm text-[#111827]", labTableCellBody)}>
        {names}
        {more}
      </p>
    </div>
  );
}

function appointmentStatusPill(row: LabAppointmentRow) {
  const label = appointmentStatusDisplayLabel(row.status);
  const tone =
    row.status === "COMPLETED"
      ? "bg-[#ECFDF3] text-[#027A48]"
      : row.status === "NO_SHOW" || row.status === "CANCELLED"
        ? "bg-[#FEF3F2] text-[#B42318]"
        : row.status === "CHECKED_IN" || row.status === "CONFIRMED"
          ? "bg-[#FFF7E8] text-[#B7791F]"
          : "bg-[#F3F0FF] text-[#6D4FF5]";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium leading-none", tone)}>
      {label}
    </span>
  );
}

function prepCell(row: LabAppointmentRow) {
  const { tags, instructionLine } = formatPrepNotesDisplay(row);
  return (
    <div className="max-w-[200px]">
      <div className="flex flex-wrap gap-1">
        {row.isOverdue ? (
          <Badge variant="warning" className="text-[10px]">
            Overdue
          </Badge>
        ) : null}
        {tags.map((tag) => (
          <Badge key={tag} variant={tag.toLowerCase() === "fasting" ? "warning" : "secondary"} className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>
      {instructionLine ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{instructionLine}</p>
      ) : null}
    </div>
  );
}

export function VisitAppointmentsTable({
  rows,
  busyId,
  onRowOpen,
  onConfirm,
  onCheckIn,
  onComplete,
  onMarkNoShow,
}: Props) {
  return (
    <LabDataTable className="rounded-none border-0 border-t border-[#ECEBFF] shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Patient</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead>Appointment slot</TableHead>
            <TableHead>Prep notes</TableHead>
            <TableHead>Workflow status</TableHead>
            <TableHead>Workflow hint</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer border-0" onClick={() => onRowOpen(row)}>
              <TableCell>
                <p className="font-semibold text-[#111827]">{row.patientName}</p>
                <p className="text-xs text-[#6B7280]">{patientSubline(row)}</p>
              </TableCell>
              <TableCell>{testsCell(row)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <p className="text-sm font-medium text-[#111827]">{row.slotDateLabel}</p>
                <p className="text-xs text-[#6B7280]">{row.slotTimeLabel}</p>
              </TableCell>
              <TableCell>{prepCell(row)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>{appointmentStatusPill(row)}</TableCell>
              <TableCell className="max-w-[160px] text-xs text-[#6B7280]">{row.workflowHint}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <VisitAppointmentRowActions
                  row={row}
                  busy={busyId === row.id}
                  onConfirm={onConfirm}
                  onCheckIn={onCheckIn}
                  onComplete={onComplete}
                  onMarkNoShow={onMarkNoShow}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LabDataTable>
  );
}
