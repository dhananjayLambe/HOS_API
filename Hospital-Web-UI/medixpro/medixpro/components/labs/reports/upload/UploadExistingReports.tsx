"use client";

import type { UploadHistoricalReport } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import { cn } from "@/lib/utils";

type UploadExistingReportsProps = {
  items: UploadHistoricalReport[];
};

export function UploadExistingReports({ items }: UploadExistingReportsProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "mt-4 rounded-md border border-[#E5E7EB] bg-[#F9FAFB]/80 px-2.5 py-2",
        "text-[10px] text-[#9CA3AF]",
      )}
      aria-label="Historical reports"
    >
      <h3 className="font-medium uppercase tracking-wide text-[#9CA3AF]">
        Historical reports (read-only)
      </h3>
      <p className="mt-0.5 text-[9px]">Earlier uploads for context — not part of this upload.</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li
            key={item.reportId}
            className="flex min-w-0 items-center justify-between gap-2 border-t border-[#F3F4F6] pt-1 first:border-0 first:pt-0"
          >
            <span className="min-w-0 truncate text-[#6B7280]">{item.testLabel}</span>
            <span className="shrink-0 rounded bg-[#F3F4F6] px-1 py-0.5 text-[9px] font-medium text-[#6B7280]">
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
