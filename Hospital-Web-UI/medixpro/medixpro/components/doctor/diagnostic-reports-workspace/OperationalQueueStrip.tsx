"use client";

import { FileWarning, Inbox } from "lucide-react";
import { ClinicalKpiCard } from "@/components/clinical";
import { cn } from "@/lib/utils";
import type {
  OperationalQueue,
  OperationalQueueCounts,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

const QUEUE_META: {
  id: OperationalQueue;
  label: string;
  description: string;
  icon: typeof Inbox;
}[] = [
  {
    id: "reports_ready",
    label: "Reports Ready",
    description: "Ready to view",
    icon: Inbox,
  },
  {
    id: "awaiting",
    label: "Awaiting Results",
    description: "Ordered, not ready",
    icon: FileWarning,
  },
];

type OperationalQueueStripProps = {
  counts: OperationalQueueCounts;
  active: OperationalQueue | null;
  onSelect: (queue: OperationalQueue | null) => void;
  loading?: boolean;
  compact?: boolean;
};

export function OperationalQueueStrip({
  counts,
  active,
  onSelect,
  loading,
  compact,
}: OperationalQueueStripProps) {
  return (
    <div
      className={cn(
        "grid w-full gap-2",
        compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
      )}
    >
      {QUEUE_META.map((meta) => {
        const count = counts[meta.id];
        const isActive = active === meta.id;
        return (
          <ClinicalKpiCard
            key={meta.id}
            queue={meta.id}
            label={meta.label}
            description={meta.description}
            count={count}
            icon={meta.icon}
            active={isActive}
            loading={loading}
            compact={compact}
            onClick={() => onSelect(isActive ? null : meta.id)}
          />
        );
      })}
    </div>
  );
}
