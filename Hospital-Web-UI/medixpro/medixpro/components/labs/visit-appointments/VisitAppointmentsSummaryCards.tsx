"use client";

import { StatusCard } from "@/components/labs/premium/StatusCard";
import type { VisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments-types";
import type { VisitAppointmentsStatusTab } from "@/lib/labs/visit-appointments/build-visit-appointments-query";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, UserCheck, type LucideIcon } from "lucide-react";

const CARD_DEFS: {
  key: keyof VisitAppointmentsSummary;
  label: string;
  tab: VisitAppointmentsStatusTab;
  icon: LucideIcon;
}[] = [
  { key: "scheduled_today", label: "Scheduled today", tab: "scheduled", icon: Clock },
  { key: "confirmed_today", label: "Confirmed today", tab: "confirmed", icon: CalendarCheck },
  { key: "checked_in", label: "Checked in", tab: "checked_in", icon: UserCheck },
  { key: "completed_today", label: "Completed today", tab: "completed", icon: CheckCircle2 },
  { key: "failed_no_show", label: "No show / failed", tab: "failed", icon: AlertTriangle },
];

export function VisitAppointmentsSummaryCards({
  summary,
  activeTab,
  onTabSelect,
  className,
}: {
  summary: VisitAppointmentsSummary;
  activeTab?: VisitAppointmentsStatusTab;
  onTabSelect?: (tab: VisitAppointmentsStatusTab) => void;
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
