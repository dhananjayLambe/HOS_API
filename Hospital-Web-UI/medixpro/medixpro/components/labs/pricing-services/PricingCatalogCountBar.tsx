"use client";

import type { PricingCatalogTab } from "@/lib/labs/api/pricing-services-types";
import { cn } from "@/lib/utils";

type Props = {
  catalogTab: PricingCatalogTab;
  page: number;
  pageSize: number;
  total: number;
  rowCount: number;
  activeViewLabel?: string | null;
  className?: string;
};

export function PricingCatalogCountBar({
  catalogTab,
  page,
  pageSize,
  total,
  rowCount,
  activeViewLabel,
  className,
}: Props) {
  const noun = catalogTab === "services" ? "services" : "packages";
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEBFF] bg-[#FAF9FF]/50 px-4 py-2 text-xs",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-[#374151]">
          {total > 0 ? (
            <>
              Showing {start}–{end} of <span className="text-[#111827]">{total}</span> {noun}
            </>
          ) : (
            <>No {noun} in this view</>
          )}
        </p>
        {activeViewLabel ? (
          <p className="mt-0.5 text-[11px] text-[#7C5CFC]">
            View: <span className="font-medium">{activeViewLabel}</span>
          </p>
        ) : null}
      </div>
      {rowCount > 0 && total > rowCount ? (
        <p className="text-[#6B7280]">{rowCount} on this page</p>
      ) : null}
    </div>
  );
}
