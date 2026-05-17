"use client";

import { LabActivityTimeline } from "@/components/labs/common/LabActivityTimeline";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { buildCollectionTimeline } from "@/lib/labs/home-collections/build-collection-timeline";
import type { LabCollectionRow } from "@/lib/labs/types";
import { useMemo } from "react";

export function CollectionDetailTimelineSection({ row }: { row: LabCollectionRow }) {
  const events = useMemo(() => buildCollectionTimeline(row), [row]);

  return (
    <section>
      <h3 className={sectionTitle}>Collection timeline</h3>
      <LabActivityTimeline
        events={events}
        emptyTitle="No workflow events yet"
        emptyDescription="Assignment, start, collect, and fail actions will appear here as the request progresses."
      />
    </section>
  );
}
