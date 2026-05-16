"use client";

import { LabActivityTimeline } from "@/components/labs/common/LabActivityTimeline";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import type { LabTimelineEvent } from "@/lib/labs/types";

export function OrderDetailTimelineSection({ events }: { events: LabTimelineEvent[] }) {
  if (!events.length) return null;

  return (
    <section>
      <h3 className={sectionTitle}>Activity timeline</h3>
      <LabActivityTimeline events={events} />
    </section>
  );
}
