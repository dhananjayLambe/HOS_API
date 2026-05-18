"use client";

import { Button } from "@/components/ui/button";
import type { VisitAppointmentActionKey } from "@/lib/labs/api/visit-appointments-types";
import { VISIT_ACTION_LABELS } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";

type Props = {
  row: LabAppointmentRow;
  busy?: boolean;
  onConfirm: (row: LabAppointmentRow) => void;
  onCheckIn: (row: LabAppointmentRow) => void;
  onComplete: (row: LabAppointmentRow) => void;
  onMarkNoShow: (row: LabAppointmentRow) => void;
  onReschedule: (row: LabAppointmentRow) => void;
};

export function VisitAppointmentRowActions({
  row,
  busy,
  onConfirm,
  onCheckIn,
  onComplete,
  onMarkNoShow,
  onReschedule,
}: Props) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const actions = row.allowedActions;

  const handlers: Record<VisitAppointmentActionKey, (row: LabAppointmentRow) => void> = {
    confirm: onConfirm,
    check_in: onCheckIn,
    complete: onComplete,
    mark_no_show: onMarkNoShow,
    reschedule: onReschedule,
  };

  const variants: Partial<Record<VisitAppointmentActionKey, "default" | "secondary">> = {
    mark_no_show: "secondary",
    reschedule: "secondary",
  };

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {(Object.keys(VISIT_ACTION_LABELS) as VisitAppointmentActionKey[]).map((key) => {
        if (!actions.includes(key)) return null;
        return (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={variants[key] ?? "default"}
            disabled={busy}
            onClick={(e) => {
              stop(e);
              handlers[key](row);
            }}
          >
            {VISIT_ACTION_LABELS[key]}
          </Button>
        );
      })}
    </div>
  );
}
