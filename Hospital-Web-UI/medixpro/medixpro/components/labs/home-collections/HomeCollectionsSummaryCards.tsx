"use client";

import type { HomeCollectionsSummary } from "@/lib/labs/api/home-collections-types";
import { cn } from "@/lib/utils";

const CARD_DEFS: { key: keyof HomeCollectionsSummary; label: string }[] = [
  { key: "pending_collections", label: "Pending collections" },
  { key: "assigned_today", label: "Assigned today" },
  { key: "active_collections", label: "Active collections" },
  { key: "collected_today", label: "Collected today" },
  { key: "failed_no_response", label: "Failed / no response" },
];

export function HomeCollectionsSummaryCards({
  summary,
  className,
}: {
  summary: HomeCollectionsSummary;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {CARD_DEFS.map(({ key, label }) => (
        <article key={key} className="rounded-xl border border-[#ECEBFF] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-[#6B7280]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#111827]">{summary[key]}</p>
        </article>
      ))}
    </section>
  );
}
