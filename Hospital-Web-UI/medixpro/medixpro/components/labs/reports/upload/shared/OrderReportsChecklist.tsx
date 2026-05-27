"use client";

import {
  lineStatusLabel,
  type OrderReportLineItem,
  type OrderUploadProgress,
} from "@/lib/labs/reports/upload/order-report-lines";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

type OrderReportsChecklistProps = {
  lines: OrderReportLineItem[];
  progress: OrderUploadProgress;
  /** Compact list for sidebar; default card for main steps. */
  variant?: "card" | "compact";
};

const STATUS_BADGE: Record<ReportOperationalStatus, string> = {
  PENDING_UPLOAD: "bg-amber-50 text-amber-800 ring-amber-200/80",
  UPLOADED: "bg-sky-50 text-sky-800 ring-sky-200/80",
  READY_DELIVERY: "bg-violet-50 text-violet-800 ring-violet-200/80",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  FAILED_DELIVERY: "bg-red-50 text-red-800 ring-red-200/80",
};

function LineIcon({ line }: { line: OrderReportLineItem }) {
  if (line.operationalStatus === "DELIVERED" || line.operationalStatus === "READY_DELIVERY") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (line.needsUpload) {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />;
  }
  return <Circle className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />;
}

export function OrderReportsChecklist({
  lines,
  progress,
  variant = "card",
}: OrderReportsChecklistProps) {
  if (lines.length === 0) return null;

  const isCompact = variant === "compact";

  return (
    <section
      className={cn(
        isCompact
          ? "mt-3 border-t border-[#F0EFFF] pt-3"
          : "rounded-lg border border-[#ECEBFF] bg-white px-3 py-2.5",
      )}
      aria-label="Order report checklist"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3
            className={cn(
              "font-semibold uppercase tracking-wider text-[#9CA3AF]",
              isCompact ? "text-[10px]" : "text-[10px]",
            )}
          >
            Reports on this order
          </h3>
          <p className={cn("mt-0.5 text-[#374151]", isCompact ? "text-[10px]" : "text-xs")}>
            {progress.summary}
          </p>
        </div>
        {progress.total > 1 ? (
          <span
            className={cn(
              "shrink-0 rounded-full bg-[#F3F4FF] px-2 py-0.5 font-semibold text-[#7C5CFC]",
              isCompact ? "text-[9px]" : "text-[10px]",
            )}
          >
            {progress.total - progress.pendingUploadCount}/{progress.total} done
          </span>
        ) : null}
      </div>

      <ul className={cn("space-y-1.5", isCompact ? "mt-2" : "mt-2.5")}>
        {lines.map((line) => (
          <li
            key={line.reportId}
            className={cn(
              "flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5",
              line.isCurrentUploadTarget && "bg-[#F5F3FF] ring-1 ring-[#ECEBFF]",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <LineIcon line={line} />
              <span
                className={cn(
                  "min-w-0 truncate font-medium text-[#111827]",
                  isCompact ? "text-[11px]" : "text-xs",
                )}
              >
                {line.testLabel}
                {line.isCurrentUploadTarget ? (
                  <span className="ml-1 font-normal text-[#7C5CFC]">(uploading now)</span>
                ) : null}
              </span>
            </div>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset",
                STATUS_BADGE[line.operationalStatus],
              )}
            >
              {line.needsUpload ? "Needs upload" : lineStatusLabel(line.operationalStatus)}
            </span>
          </li>
        ))}
      </ul>

      {progress.pendingUploadCount > 0 ? (
        <p
          className={cn(
            "mt-2 text-amber-800",
            isCompact ? "text-[10px]" : "text-xs",
          )}
          role="status"
        >
          Missing uploads: {progress.pendingUploadLabels.join(", ")}
        </p>
      ) : progress.isOrderComplete ? (
        <p className={cn("mt-2 text-emerald-700", isCompact ? "text-[10px]" : "text-xs")} role="status">
          Order complete — all reports delivered.
        </p>
      ) : progress.isOrderReadyForDelivery ? (
        <p className={cn("mt-2 text-violet-700", isCompact ? "text-[10px]" : "text-xs")} role="status">
          All reports uploaded — order ready for delivery.
        </p>
      ) : null}
    </section>
  );
}
