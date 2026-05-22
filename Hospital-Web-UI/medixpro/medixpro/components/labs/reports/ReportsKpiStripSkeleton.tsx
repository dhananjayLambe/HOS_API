"use client";

import { labStatusCardShellCompact } from "@/components/labs/labDesignTokens";
import { cn } from "@/lib/utils";

export function ReportsKpiStripSkeleton() {
  return (
    <div className="flex flex-col gap-1.5" aria-busy aria-label="Loading report KPIs">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 md:flex-wrap md:overflow-visible">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              labStatusCardShellCompact,
              "h-[52px] min-w-[5.5rem] animate-pulse border border-[#ECEBFF] bg-[#F4F1FF]/60",
            )}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-[#F0EFFF]" />
        <div className="h-4 w-24 animate-pulse rounded bg-[#F0EFFF]" />
      </div>
    </div>
  );
}
