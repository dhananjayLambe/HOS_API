"use client";

import { AppointmentDetailTimelineSection } from "@/components/labs/visit-appointments/AppointmentDetailTimelineSection";
import { AppointmentDetailWorkflowSection } from "@/components/labs/visit-appointments/AppointmentDetailWorkflowSection";
import { VisitAppointmentRowActions } from "@/components/labs/visit-appointments/VisitAppointmentRowActions";
import { formatPrepNotesDisplay } from "@/lib/labs/visit-appointments/format-prep-notes";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { appointmentStatusDisplayLabel } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";

type Props = {
  row: LabAppointmentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: (row: LabAppointmentRow) => void;
  onCheckIn: (row: LabAppointmentRow) => void;
  onComplete: (row: LabAppointmentRow) => void;
  onMarkNoShow: (row: LabAppointmentRow) => void;
  onReschedule: (row: LabAppointmentRow) => void;
};

export function AppointmentDetailSheet({
  row,
  open,
  onOpenChange,
  busy,
  onConfirm,
  onCheckIn,
  onComplete,
  onMarkNoShow,
  onReschedule,
}: Props) {
  if (!row) return null;

  const { tags, instructionLine } = formatPrepNotesDisplay(row);
  const statusLabel = appointmentStatusDisplayLabel(row.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l border-[#ECEBFF] bg-white p-0 sm:max-w-md">
        <SheetHeader className="space-y-2 border-b border-[#ECEBFF] px-4 py-4 text-left">
          <SheetTitle className="text-lg font-semibold">{row.patientName}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <LabStatusBadge
              domain="appointment"
              status={row.status}
              label={statusLabel}
            />
            <span className="text-sm text-[#6B7280]">
              {row.slotDateLabel} · {row.slotTimeLabel}
            </span>
            <span className="text-xs text-[#6B7280]">
              {row.appointmentId} · Order {row.orderNumber}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4">
            <section>
              <h3 className={sectionTitle}>Patient</h3>
              <p className="mt-1 text-sm">{row.patientName}</p>
              <p className="text-sm text-[#6B7280]">{row.patientPhone}</p>
              {(row.patientAge != null || row.patientGender) && (
                <p className="mt-1 text-xs text-[#6B7280]">
                  {[row.patientAge, row.patientGender].filter(Boolean).join(" · ")}
                </p>
              )}
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Tests</h3>
              <ul className="mt-2 space-y-1">
                {row.testNames.map((name) => (
                  <li key={name} className="rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 px-3 py-2 text-sm">
                    {name}
                  </li>
                ))}
                {row.testNamesOverflow > 0 ? (
                  <li className="text-xs text-[#6B7280]">+{row.testNamesOverflow} more on order</li>
                ) : null}
              </ul>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Appointment details</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#6B7280]">Date</dt>
                  <dd>
                    {row.appointmentDate} · {row.appointmentSlot}
                  </dd>
                </div>
                {row.patientNotes ? (
                  <div>
                    <dt className="text-[#6B7280]">Notes</dt>
                    <dd className="mt-0.5">{row.patientNotes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Prep instructions</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant={tag.toLowerCase() === "fasting" ? "warning" : "secondary"} className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              {instructionLine ? <p className="mt-2 text-sm text-[#111827]">{instructionLine}</p> : null}
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <AppointmentDetailWorkflowSection row={row} />

            <Separator className="bg-[#ECEBFF]" />

            <AppointmentDetailTimelineSection row={row} />
          </div>
        </ScrollArea>

        <footer className="mt-auto border-t border-[#ECEBFF] px-4 py-4">
          <VisitAppointmentRowActions
            row={row}
            busy={busy}
            onConfirm={onConfirm}
            onCheckIn={onCheckIn}
            onComplete={onComplete}
            onMarkNoShow={onMarkNoShow}
            onReschedule={onReschedule}
          />
        </footer>
      </SheetContent>
    </Sheet>
  );
}
