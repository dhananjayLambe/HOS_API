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
  activeWorkflow: CompletionFilterKey;
  onSelect: (filter: CompletionFilterKey) => void;
};

export function CompletionKpiStrip({ kpis, activeWorkflow, onSelect }: CompletionKpiStripProps) {
  const items: KpiItem[] = [
    { key: "pending", label: "Not Started", value: kpis.notStarted },
    { key: "all", label: "In Progress", value: kpis.inProgress },
    { key: "ready", label: "Ready To Send", value: kpis.readyToSend },
    { key: "delivered", label: "Delivered", value: kpis.delivered },
    { key: "failed", label: "Attention Required", value: kpis.attentionRequired },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Summary metrics">
      {items.map((item) => {
        const isActive = activeWorkflow === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-pressed={isActive}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]",
              isActive
                ? "border-[#7C5CFC] bg-[#EDE9FF] shadow-sm"
                : "border-[#E5E7EB] bg-white hover:border-[#7C5CFC]/40",
            )}
          >
            <span className="text-lg font-semibold leading-none text-[#111827]">{item.value}</span>
            <span className={cn("text-[10px] font-medium leading-tight", isActive ? "text-[#5B3FD9]" : "text-[#6B7280]")}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
