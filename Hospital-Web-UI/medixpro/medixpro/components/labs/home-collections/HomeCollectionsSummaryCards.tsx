"use client";

import { StatusCard } from "@/components/labs/premium/StatusCard";
import type { HomeCollectionsSummary } from "@/lib/labs/api/home-collections-types";
import type { HomeCollectionsStatusTab } from "@/lib/labs/home-collections/build-home-collections-query";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, PlayCircle, UserCheck, type LucideIcon } from "lucide-react";

const CARD_DEFS: {
  key: keyof HomeCollectionsSummary;
  label: string;
  tab: HomeCollectionsStatusTab;
  icon: LucideIcon;
}[] = [
  { key: "pending_collections", label: "Pending collections", tab: "pending", icon: Clock },
  { key: "assigned_today", label: "Assigned today", tab: "assigned", icon: UserCheck },
  { key: "active_collections", label: "Active collections", tab: "active", icon: PlayCircle },
  { key: "collected_today", label: "Collected today", tab: "collected", icon: CheckCircle2 },
  { key: "failed_no_response", label: "Failed / no response", tab: "failed", icon: AlertTriangle },
];

export function HomeCollectionsSummaryCards({
  summary,
  activeTab,
  onTabSelect,
  className,
}: {
  summary: HomeCollectionsSummary;
  activeTab?: HomeCollectionsStatusTab;
  onTabSelect?: (tab: HomeCollectionsStatusTab) => void;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {CARD_DEFS.map(({ key, label, tab, icon }) => {
        const isActive = activeTab === tab;
        const interactive = Boolean(onTabSelect);

        const card = (
          <StatusCard
            title={label}
            value={summary[key]}
            icon={icon}
            className={cn(
              interactive && "cursor-pointer transition-[box-shadow,transform] hover:-translate-y-0.5",
              isActive && "ring-2 ring-[#7C5CFC]/35 ring-offset-2",
            )}
          />
        );

        if (!interactive) {
          return <div key={key}>{card}</div>;
        }

        return (
          <button
            key={key}
            type="button"
            className="text-left"
            aria-pressed={isActive}
            onClick={() => onTabSelect?.(tab)}
          >
            {card}
          </button>
        );
      })}
    </section>
  );
}
