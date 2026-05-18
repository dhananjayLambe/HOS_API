"use client";

import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { COLLECTION_TYPE_LABELS } from "@/lib/labs/constants/collection-type";
import {
  reportsTaskRowClassName,
  reportsTaskRowSelectedClassName,
} from "@/lib/labs/reports/reports-table-styles";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";

type PendingTaskRowProps = {
  task: ReportTask;
  selected: boolean;
  onSelect: () => void;
};

export function PendingTaskRow({ task, selected, onSelect }: PendingTaskRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(reportsTaskRowClassName, "w-full text-left", selected && reportsTaskRowSelectedClassName)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#111827]">{task.testLabel}</p>
        <p className="text-[10px] text-[#9CA3AF]">
          {COLLECTION_TYPE_LABELS[task.collectionType]} · {task.collectedAtLabel}
        </p>
      </div>
      <LabStatusBadge domain="report" status={task.operationalStatus} className="px-2 py-0.5 text-[10px]" />
    </button>
  );
}
