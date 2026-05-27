"use client";

import { OrderReportsChecklist } from "@/components/labs/reports/upload/shared/OrderReportsChecklist";
import { labCardSurface, labStickyBelowHeader, labTextMuted } from "@/components/labs/labDesignTokens";
import { COLLECTION_TYPE_LABELS } from "@/lib/labs/constants/collection-type";
import { operationalStatusLabel } from "@/lib/labs/reports/report-operational-status";
import type { UploadTaskContext } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import { cn } from "@/lib/utils";
import { ChevronDown, Phone } from "lucide-react";
import { useState } from "react";

type UploadTaskSummarySidebarProps = {
  task: UploadTaskContext | null;
  attachmentCount?: number;
  primaryFileName?: string | null;
};

export function UploadTaskSummarySidebar({
  task,
  attachmentCount,
  primaryFileName,
}: UploadTaskSummarySidebarProps) {
  const [open, setOpen] = useState(false);

  if (!task) {
    return (
      <aside
        className={cn(
          "self-start rounded-lg border border-dashed border-[#ECEBFF] bg-[#FAF9FF]/40 p-2.5 text-xs lg:sticky",
          labTextMuted,
          labStickyBelowHeader,
        )}
      >
        Select a report task to see summary.
      </aside>
    );
  }

  const body = (
    <>
      <p className="text-base font-semibold text-[#111827]">{task.patientName}</p>
      {task.patientPhone ? (
        <p className={cn("mt-0.5 flex items-center gap-1 text-xs", labTextMuted)}>
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          {task.patientPhone}
        </p>
      ) : null}
      <p className="mt-1 text-xs font-medium text-[#374151]">{task.testLabelSummary}</p>
      <dl className="mt-3 divide-y divide-[#F0EFFF] text-xs">
        <Row label="Collection" value={COLLECTION_TYPE_LABELS[task.collectionType]} />
        <Row label="Visit / slot" value={task.visitOrSlotLabel} truncate />
        <Row label="Order" value={`#${task.orderNumber}`} />
        <Row label="Status" value={operationalStatusLabel(task.operationalStatus)} />
        {task.pendingSiblingCount > 0 ? (
          <Row
            label="Pending reports"
            value={String(task.pendingSiblingCount)}
            valueClassName="font-semibold text-amber-700"
          />
        ) : null}
        {primaryFileName ? <Row label="Primary report" value={primaryFileName} truncate /> : null}
        {attachmentCount != null && attachmentCount > 0 ? (
          <Row label="New attachments" value={String(attachmentCount)} />
        ) : null}
      </dl>
      {task.reportLines.length > 0 ? (
        <OrderReportsChecklist
          lines={task.reportLines}
          progress={task.uploadProgress}
          variant="compact"
        />
      ) : null}
    </>
  );

  return (
    <>
      {/* Mobile / narrow: collapsible below upload */}
      <div className="lg:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-[#ECEBFF] bg-white px-3 py-2 text-left text-xs font-semibold text-[#7C5CFC]"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Task summary
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} aria-hidden />
        </button>
        {open ? (
          <aside className={cn(labCardSurface, "mt-2 p-3.5")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Selected task
            </p>
            {body}
          </aside>
        ) : null}
      </div>

      {/* Desktop: right column sticky card */}
      <aside
        className={cn(
          labCardSurface,
          "hidden self-start p-3.5 lg:sticky lg:block",
          labStickyBelowHeader,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Selected task
        </p>
        {body}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  truncate,
  valueClassName,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
      <dt className="text-[#9CA3AF]">{label}</dt>
      <dd
        className={cn(
          "font-medium text-[#111827]",
          truncate && "max-w-[58%] truncate text-right",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
