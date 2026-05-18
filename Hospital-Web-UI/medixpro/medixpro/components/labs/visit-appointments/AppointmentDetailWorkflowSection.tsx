"use client";

import { Badge } from "@/components/ui/badge";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { appointmentStatusDisplayLabel } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";

export function AppointmentDetailWorkflowSection({ row }: { row: LabAppointmentRow }) {
  const label = appointmentStatusDisplayLabel(row.status);
  return (
    <section>
      <h3 className={sectionTitle}>Workflow status</h3>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 px-3 py-2">
        <span className="text-xs font-medium text-[#6B7280]">Appointment</span>
        <div className="flex flex-wrap items-center gap-2">
          {row.isOverdue ? (
            <Badge variant="warning" className="text-[10px]">
              Overdue
            </Badge>
          ) : null}
          <LabStatusBadge domain="appointment" status={row.status} label={label} />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">
        Next step: <span className="font-medium text-[#374151]">{row.workflowHint}</span>
      </p>
    </section>
  );
}
