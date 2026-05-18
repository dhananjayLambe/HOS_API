"use client";

import { Button } from "@/components/ui/button";
import type { ExistingReportItem } from "@/lib/labs/reports/existing-reports";
import { operationalStatusLabel } from "@/lib/labs/reports/report-operational-status";
import { mockReportPreviewUrl } from "@/lib/labs/reports/reports-mock-service";
import { ExternalLink } from "lucide-react";

type ExistingReportsSectionProps = {
  items: ExistingReportItem[];
};

export function ExistingReportsSection({ items }: ExistingReportsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-md border border-[#F0EFFF] bg-[#F8F7FF]/60 px-2.5 py-2">
      <h3 className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
        Existing reports for this patient
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item.taskId} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="min-w-0 truncate text-[#6B7280]">
              {item.label} · {operationalStatusLabel(item.status)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1.5 text-[10px] text-[#6B7280]"
              onClick={() => window.open(mockReportPreviewUrl(item.taskId), "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-0.5 h-2.5 w-2.5" aria-hidden />
              View
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
