"use client";

import { COLLECTION_TYPE_LABELS } from "@/lib/labs/constants/collection-type";
import type { ExistingReportItem } from "@/lib/labs/reports/existing-reports";
import { operationalStatusLabel } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

type UploadSummaryPanelProps = {
  task: ReportTask | null;
  pendingSiblingCount: number;
  existingReports: ExistingReportItem[];
  primaryFileName?: string | null;
  attachmentCount?: number;
};

export function UploadSummaryPanel({
  task,
  pendingSiblingCount,
  existingReports,
  primaryFileName,
  attachmentCount,
}: UploadSummaryPanelProps) {
  if (!task) {
    return (
      <aside className="rounded-xl border border-dashed border-[#ECEBFF] bg-[#FAFAFF] p-3 text-xs text-[#6B7280]">
        Select a report task to see summary.
      </aside>
    );
  }

  const testCount = task.testNames.length;
  const collectedShort = task.collectedAtLabel.replace(/^Collected\s?/i, "") || task.collectedAtLabel;

  return (
    <aside className="sticky top-24 rounded-xl border border-[#ECEBFF] bg-white p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Selected task</p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{task.patientName}</p>
      {task.patientPhone ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6B7280]">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          {task.patientPhone}
        </p>
      ) : null}
      <p className="mt-1 text-xs font-medium text-[#374151]">{task.testLabel}</p>

      <dl className="mt-3 space-y-1.5 border-t border-[#F0EFFF] pt-3 text-xs">
        <Row label="Tests" value={String(testCount)} />
        <Row label="Collection" value={COLLECTION_TYPE_LABELS[task.collectionType]} />
        <Row label="Collected" value={collectedShort} />
        <Row label="Visit / slot" value={task.visitOrSlotLabel} truncate />
        <Row label="Order" value={`#${task.orderNumber}`} />
        <Row label="Status" value={operationalStatusLabel(task.operationalStatus)} />
        <Row
          label="Pending reports"
          value={String(pendingSiblingCount)}
          valueClassName={pendingSiblingCount > 0 ? "font-semibold text-amber-700" : undefined}
        />
        {primaryFileName ? <Row label="Primary file" value={primaryFileName} truncate /> : null}
        {attachmentCount != null && attachmentCount > 0 ? (
          <Row label="Attachments" value={String(attachmentCount)} />
        ) : null}
      </dl>

      {existingReports.length > 0 ? (
        <div className="mt-3 border-t border-[#F0EFFF] pt-2">
          <p className="text-[9px] font-semibold uppercase text-[#9CA3AF]">Other patient reports</p>
          <ul className="mt-1 space-y-0.5">
            {existingReports.map((r) => (
              <li key={r.taskId} className="truncate text-[10px] text-[#6B7280]">
                {r.label} · {operationalStatusLabel(r.status)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
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
    <div className="flex justify-between gap-2">
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
