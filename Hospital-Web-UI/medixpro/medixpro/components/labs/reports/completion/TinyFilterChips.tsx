"use client";

import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

const FILTERS: { key: CompletionFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Upload" },
  { key: "ready", label: "Ready To Send" },
  { key: "urgent", label: "Urgent" },
  { key: "failed", label: "Failed" },
  { key: "delivered", label: "Delivered" },
];

export type TinyFilterChipsProps = {
  active: CompletionFilterKey;
  onChange: (key: CompletionFilterKey) => void;
};

export function TinyFilterChips({ active, onChange }: TinyFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Filter orders">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            active === key
              ? "border-[#7C5CFC] bg-[#EDE9FF] text-[#5B3FD9]"
              : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D1D5DB]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
