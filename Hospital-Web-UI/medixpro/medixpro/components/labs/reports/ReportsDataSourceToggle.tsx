"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isReportsDataSourceToggleVisible } from "@/lib/labs/reports/report-tasks-config";
import { isReportsDemoForced } from "@/lib/labs/reports/reports-demo-queue";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ENV_DEMO_LOCKED = process.env.NEXT_PUBLIC_LAB_REPORTS_DEMO === "true";

type ReportsDataSourceToggleProps = {
  className?: string;
};

/** QA toggle (hidden unless NEXT_PUBLIC_LAB_REPORTS_DATA_SOURCE_TOGGLE=true). Mock also via `?demo=1`. */
export function ReportsDataSourceToggle({ className }: ReportsDataSourceToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMock = isReportsDemoForced(searchParams);

  const setMode = useCallback(
    (mode: "live" | "mock") => {
      if (ENV_DEMO_LOCKED) return;
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "mock") params.set("demo", "1");
      else params.delete("demo");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (!isReportsDataSourceToggleVisible()) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Report queue data source"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        Test data
      </span>
      <ToggleGroup
        type="single"
        value={isMock ? "mock" : "live"}
        onValueChange={(value) => {
          if (!value || ENV_DEMO_LOCKED) return;
          setMode(value as "live" | "mock");
        }}
        className="rounded-md border border-[#E5E7EB] bg-white p-0.5"
        disabled={ENV_DEMO_LOCKED}
      >
        <ToggleGroupItem
          value="live"
          className="h-7 rounded px-2.5 text-xs data-[state=on]:bg-[#EDE9FF] data-[state=on]:text-[#5B3FD9]"
          aria-label="Use live API queue"
        >
          Live API
        </ToggleGroupItem>
        <ToggleGroupItem
          value="mock"
          className="h-7 rounded px-2.5 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-900"
          aria-label="Use mock fixture queue"
        >
          Mock
        </ToggleGroupItem>
      </ToggleGroup>
      {ENV_DEMO_LOCKED ? (
        <span className="text-[10px] text-amber-800">Mock locked by env</span>
      ) : null}
    </div>
  );
}
