"use client";

import { Badge } from "@/components/ui/badge";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { appointmentStatusDisplayLabel } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { LabAppointmentRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

function statusPillClass(status: LabAppointmentRow["status"]): string {
  if (status === "COMPLETED") return "bg-[#ECFDF3] text-[#027A48]";
  if (status === "NO_SHOW" || status === "CANCELLED") return "bg-[#FEF3F2] text-[#B42318]";
  if (status === "CHECKED_IN" || status === "CONFIRMED") return "bg-[#FFF7E8] text-[#B7791F]";
  return "bg-[#F3F0FF] text-[#6D4FF5]";
}

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
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium leading-none",
              statusPillClass(row.status),
            )}
          >
            {label}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">
        Next step: <span className="font-medium text-[#374151]">{row.workflowHint}</span>
      </p>
    </section>
  );
}
