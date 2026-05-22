"use client";

import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { Button } from "@/components/ui/button";
import { COLLECTION_TYPE_LABELS } from "@/lib/labs/constants/collection-type";
import { isPendingUploadStatus } from "@/lib/labs/reports/report-operational-status";
import { reportStatusBadgeClassName } from "@/lib/labs/reports/report-status-badge-tone";
import { resolvePrimaryCTA } from "@/lib/labs/reports/report-task-primary-action";
import {
  collectionTypeBadgeClassName,
  taskRowContainerClassName,
  urgencyBadgeClassName,
} from "@/lib/labs/reports/queue-tokens";
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
  const primary = resolvePrimaryCTA(task.taskId, task.operationalStatus);
  const loadingKey = `${task.taskId}:${primary.kind === "button" ? primary.actionKey : "upload"}`;
  const isLoading = actionLoading === loadingKey;
  const showUpdatedHint = !isPendingUploadStatus(task.operationalStatus);
  const urgencyClass = urgencyBadgeClassName(task.urgency);
  const collectionClass = collectionTypeBadgeClassName(task.collectionType);

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewOrder();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onKeyDown={handleRowKeyDown}
      onClick={onViewOrder}
      className={cn(
        "min-h-10 cursor-pointer rounded-md border px-2.5 py-2 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-1",
        taskRowContainerClassName(task.operationalStatus),
      )}
    >
      <div
        className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-semibold leading-tight text-[#111827]">{task.testLabel}</p>
            <span
              className={cn(
                "rounded border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide",
                collectionClass,
              )}
            >
              {COLLECTION_TYPE_LABELS[task.collectionType]}
            </span>
            {urgencyClass && task.urgency !== "ROUTINE" ? (
              <span
                className={cn(
                  "rounded border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide",
                  urgencyClass,
                )}
              >
                {task.urgency}
              </span>
            ) : null}
            {task.tatBreached ? (
              <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0 text-[9px] font-semibold text-red-700">
                TAT
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-[#6B7280]">
            {task.collectedAtLabel} • #{task.orderNumber}
          </p>
          {showUpdatedHint ? (
            <p className="mt-0.5 text-[10px] text-[#9CA3AF]">Updated {task.updatedAtLabel}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:hidden">
            <SecondaryActions onPreview={onPreview} onViewOrder={onViewOrder} />
          </div>
        </div>

        <div className={cn("flex flex-col items-stretch gap-1.5 sm:items-end", ACTION_COL_W)}>
          <LabStatusBadge
            domain="report"
            status={task.operationalStatus}
            className={cn(
              "self-start px-2 py-0.5 text-[10px] sm:self-end",
              reportStatusBadgeClassName(task.operationalStatus),
            )}
          />
          {primary.kind === "link" ? (
            <Button
              type="button"
              size="sm"
              className="h-9 min-h-10 w-full border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] sm:w-full"
              asChild
            >
              <Link href={primary.href} onClick={(e) => e.stopPropagation()} aria-label={primary.label}>
                {primary.label}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-9 min-h-10 w-full border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] sm:w-full"
              disabled={!!actionLoading}
              onClick={() => onPrimaryAction(primary.actionKey)}
              aria-label={primary.label}
            >
              {isLoading ? "…" : primary.label}
            </Button>
          )}
        </div>
      </div>

      <div
        className="mt-1 hidden flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:flex"
        onClick={(e) => e.stopPropagation()}
      >
        <SecondaryActions onPreview={onPreview} onViewOrder={onViewOrder} />
      </div>
    </article>
  );
}

function SecondaryActions({
  onPreview,
  onViewOrder,
}: {
  onPreview: () => void;
  onViewOrder: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="min-h-9 text-[#6D4FF5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
        onClick={onPreview}
        aria-label="Preview report"
      >
        Preview
      </button>
      <span className="text-[#D1D5DB]" aria-hidden>
        •
      </span>
      <button
        type="button"
        className="min-h-9 text-[#6B7280] hover:text-[#374151] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
        onClick={onViewOrder}
        aria-label="View order details"
      >
        View order
      </button>
    </>
  );
}
