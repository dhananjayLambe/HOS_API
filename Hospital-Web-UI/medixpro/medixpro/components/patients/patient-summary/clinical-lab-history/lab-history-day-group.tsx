"use client";

import type { ClinicalLabHistoryItem } from "./types";
import { LabHistoryCard } from "./lab-history-card";

type Props = {
  dateLabel: string;
  items: ClinicalLabHistoryItem[];
  patientId: string;
  onPreview: (item: ClinicalLabHistoryItem) => void;
  onOpenWorkspace: (item: ClinicalLabHistoryItem) => void;
};

export function LabHistoryDayGroup({
  dateLabel,
  items,
  patientId,
  onPreview,
  onOpenWorkspace,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold tracking-tight text-slate-900">{dateLabel}</p>
      <div className="space-y-3 border-l border-slate-200/50 pl-4">
        {items.map((item) => (
          <LabHistoryCard
            key={item.id}
            item={item}
            patientId={patientId}
            onPreview={onPreview}
            onOpenWorkspace={onOpenWorkspace}
          />
        ))}
      </div>
    </div>
  );
}
