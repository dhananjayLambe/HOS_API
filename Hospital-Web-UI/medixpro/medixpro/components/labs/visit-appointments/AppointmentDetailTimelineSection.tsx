"use client";

import { LabActivityTimeline } from "@/components/labs/common/LabActivityTimeline";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { buildVisitTimeline } from "@/lib/labs/visit-appointments/build-visit-timeline";
import type { LabAppointmentRow } from "@/lib/labs/types";
import { useMemo } from "react";

export function AppointmentDetailTimelineSection({ row }: { row: LabAppointmentRow }) {
  const events = useMemo(() => buildVisitTimeline(row), [row]);

  return (
    <section>
      <h3 className={sectionTitle}>Visit timeline</h3>
      <LabActivityTimeline
        events={events}
        emptyTitle="No workflow events yet"
        emptyDescription="Confirm, check-in, and complete actions will appear here as the appointment progresses."
      />
    </section>
  );
}
