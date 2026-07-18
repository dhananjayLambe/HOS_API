"use client";

import { useMemo } from "react";
import type { ClinicalLabHistoryItem } from "./types";
import { LabHistoryDayGroup } from "./lab-history-day-group";

function clinicalIso(item: ClinicalLabHistoryItem): string | null {
  return item.reportDate || item.collectionDate || item.uploadedAt;
}

function dayKey(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

type Props = {
  items: ClinicalLabHistoryItem[];
  patientId: string;
  onPreview: (item: ClinicalLabHistoryItem) => void;
  onOpenWorkspace: (item: ClinicalLabHistoryItem) => void;
};

export function LabHistoryTimeline({
  items,
  patientId,
  onPreview,
  onOpenWorkspace,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, ClinicalLabHistoryItem[]>();
    for (const item of items) {
      const key = dayKey(clinicalIso(item));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="space-y-8">
      {groups.map(([dateLabel, groupItems]) => (
        <LabHistoryDayGroup
          key={dateLabel}
          dateLabel={dateLabel}
          items={groupItems}
          patientId={patientId}
          onPreview={onPreview}
          onOpenWorkspace={onOpenWorkspace}
        />
      ))}
    </div>
  );
}
