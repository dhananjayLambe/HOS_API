"use client";

import type { CompletionKpis, CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

type KpiItem = {
  key: CompletionFilterKey;
  label: string;
  value: number;
};

export type CompletionKpiStripProps = {
  kpis: CompletionKpis;
  onSelect: (filter: CompletionFilterKey) => void;
};

export function CompletionKpiStrip({ kpis, onSelect }: CompletionKpiStripProps) {
  const items: KpiItem[] = [
    { key: "pending", label: "Pending Uploads", value: kpis.pendingUploads },
    { key: "ready", label: "Ready To Send", value: kpis.readyToSend },
    { key: "urgent", label: "Urgent Delays", value: kpis.urgentDelays },
    { key: "failed", label: "Delivery Failures", value: kpis.deliveryFailures },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Summary metrics">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={cn(
            "flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-left",
            "hover:border-[#7C5CFC]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]",
          )}
        >
          <span className="text-lg font-semibold leading-none text-[#111827]">{item.value}</span>
          <span className="text-[10px] font-medium leading-tight text-[#6B7280]">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
