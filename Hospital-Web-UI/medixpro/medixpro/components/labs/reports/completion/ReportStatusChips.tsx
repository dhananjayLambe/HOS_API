"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CHIP_STATUS_CLASS, CHIP_STATUS_ICON } from "@/lib/labs/reports/completion/chip-tokens";
import type { ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { reportStatusLabel } from "@/lib/labs/reports/completion/operational-contract";
import { sortReportChips } from "@/lib/labs/reports/completion/sort-report-chips";
import { cn } from "@/lib/utils";

export type ReportStatusChipsProps = {
  reports: ReportChipViewModel[];
  className?: string;
};

export function ReportStatusChips({ reports, className }: ReportStatusChipsProps) {
  const sorted = sortReportChips(reports);
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-wrap gap-1.5", className)} role="list" aria-label="Reports">
        {sorted.map((chip) => {
          const showArtifactHint =
            chip.artifacts.length > 0 &&
            chip.status !== "sent" &&
            chip.status !== "failed" &&
            chip.status !== "failed_delivery" &&
            chip.status !== "failed_upload";
          const artifactTooltip = chip.artifacts.map((a) => a.fileName).join(", ");
          const statusLabel = reportStatusLabel(chip.status, chip.deliveryState);
          const latestVersion = chip.versions.find((version) => version.isLatest);

          return (
            <span
              key={chip.reportId}
              role="listitem"
              className={cn(
                "inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium leading-none",
                CHIP_STATUS_CLASS[chip.status],
              )}
            >
              <span className="text-sm" aria-hidden>{CHIP_STATUS_ICON[chip.status]}</span>
              <span>{chip.testLabel}</span>
              <span className="font-semibold">{statusLabel}</span>
              {latestVersion?.isCorrected ? (
                <span className="rounded bg-white/70 px-1 py-0.5 text-[9px] font-semibold uppercase">
                  Updated
                </span>
              ) : latestVersion && latestVersion.versionNumber > 1 ? (
                <span className="rounded bg-white/70 px-1 py-0.5 text-[9px] font-semibold uppercase">
                  v{latestVersion.versionNumber}
                </span>
              ) : null}
              {showArtifactHint ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-normal leading-none text-[#6B7280]">
                      <span aria-hidden>·</span>
                      {chip.artifacts.length}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {artifactTooltip}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </span>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
