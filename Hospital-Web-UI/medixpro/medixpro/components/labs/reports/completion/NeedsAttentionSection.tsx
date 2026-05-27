"use client";

import type { AttentionItem } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

const REASON_ICON: Record<AttentionItem["reason"], string> = {
  delivery_failed: "🔴",
  tat_breached: "⚠",
  stat_pending: "🟡",
  stuck_partial: "🟡",
};

export type NeedsAttentionSectionProps = {
  items: AttentionItem[];
  onJumpTo: (taskId: string) => void;
};

export function NeedsAttentionSection({ items, onJumpTo }: NeedsAttentionSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-md border border-amber-300 bg-amber-100/80 px-2 py-1" aria-label="Needs attention">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">Needs attention</p>
      <ul className="space-y-px">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onJumpTo(item.taskId)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] font-medium text-amber-950",
                "hover:bg-amber-200/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-700",
              )}
            >
              <span className="text-[12px] leading-none" aria-hidden>{REASON_ICON[item.reason]}</span>
              <span className="truncate">{item.line}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
