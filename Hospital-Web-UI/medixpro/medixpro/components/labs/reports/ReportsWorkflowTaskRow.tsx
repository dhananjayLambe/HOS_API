"use client";

import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { Button } from "@/components/ui/button";
import { COLLECTION_TYPE_LABELS } from "@/lib/labs/constants/collection-type";
import { getPrimaryTaskAction } from "@/lib/labs/reports/report-task-primary-action";
import { reportStatusBadgeClassName } from "@/lib/labs/reports/report-status-badge-tone";
import { taskRowToneClassName } from "@/lib/labs/reports/report-task-row-tone";
import { isPendingUploadStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ACTION_COL_W = "w-full sm:w-[7.75rem] sm:shrink-0";

type ReportsWorkflowTaskRowProps = {
  task: ReportTask;
  actionLoading?: string | null;
  onPrimaryAction: (actionKey: string) => void;
  onPreview: () => void;
  onViewOrder: () => void;
};

export function ReportsWorkflowTaskRow({
  task,
  actionLoading,
  onPrimaryAction,
  onPreview,
  onViewOrder,
}: ReportsWorkflowTaskRowProps) {
  const primary = getPrimaryTaskAction(task.taskId, task.operationalStatus);
  const loadingKey = `${task.taskId}:${primary.kind === "button" ? primary.actionKey : "upload"}`;
  const isLoading = actionLoading === loadingKey;
  const showUpdatedHint = !isPendingUploadStatus(task.operationalStatus);

  return (
    <article
      className={cn(
        "rounded-md border px-2.5 py-2 shadow-sm",
        taskRowToneClassName(task.operationalStatus),
      )}
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-[#111827]">{task.testLabel}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-[#6B7280]">
            {COLLECTION_TYPE_LABELS[task.collectionType]} • {task.collectedAtLabel} • #{task.orderNumber}
          </p>
          {showUpdatedHint ? (
            <p className="mt-0.5 text-[10px] text-[#9CA3AF]">Updated {task.updatedAtLabel}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] sm:hidden">
            <button type="button" className="text-[#6D4FF5] hover:underline" onClick={onPreview}>
              Preview
            </button>
            <span className="text-[#D1D5DB]" aria-hidden>
              •
            </span>
            <button
              type="button"
              className="text-[#6B7280] hover:text-[#374151] hover:underline"
              onClick={onViewOrder}
            >
              View order
            </button>
          </div>
        </div>

        <div className={cn("flex flex-col items-stretch gap-1.5 sm:items-end", ACTION_COL_W)}>
          <LabStatusBadge
            domain="report"
            status={task.operationalStatus}
            className={cn("self-start px-2 py-0.5 text-[10px] sm:self-end", reportStatusBadgeClassName(task.operationalStatus))}
          />
          {primary.kind === "link" ? (
            <Button
              type="button"
              size="sm"
              className="h-7 w-full border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] sm:w-full"
              asChild
            >
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-7 w-full border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] sm:w-full"
              disabled={!!actionLoading}
              onClick={() => onPrimaryAction(primary.actionKey)}
            >
              {isLoading ? "…" : primary.label}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-1 hidden flex-wrap gap-x-2.5 text-[10px] sm:flex">
        <button type="button" className="text-[#6D4FF5] hover:underline" onClick={onPreview}>
          Preview
        </button>
        <span className="text-[#D1D5DB]" aria-hidden>
          •
        </span>
        <button
          type="button"
          className="text-[#6B7280] hover:text-[#374151] hover:underline"
          onClick={onViewOrder}
        >
          View order
        </button>
      </div>
    </article>
  );
}
