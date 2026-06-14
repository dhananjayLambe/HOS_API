"use client";

import type { ClinicalVisitsSummaryResponse } from "@/lib/api/visits";
import { cn } from "@/lib/utils";
import { CalendarCheck, CalendarClock, CheckCircle2, Stethoscope } from "lucide-react";

export type VisitsPageView = "visits" | "upcoming";

const CARD_DEFS: {
  key: keyof ClinicalVisitsSummaryResponse | "upcoming_appointments";
  label: string;
  icon: typeof CalendarCheck;
  view?: VisitsPageView;
}[] = [
  { key: "today_visits", label: "Today's Visits", icon: CalendarCheck, view: "visits" },
  { key: "completed_visits", label: "Completed", icon: CheckCircle2, view: "visits" },
  { key: "followups", label: "Follow-ups", icon: Stethoscope, view: "visits" },
  { key: "upcoming_appointments", label: "Upcoming", icon: CalendarClock, view: "upcoming" },
];

export function VisitsSummaryCards({
  summary,
  upcomingCount = 0,
  activeView = "visits",
  onViewSelect,
  className,
}: {
  summary: ClinicalVisitsSummaryResponse;
  upcomingCount?: number;
  activeView?: VisitsPageView;
  onViewSelect?: (view: VisitsPageView) => void;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {CARD_DEFS.map(({ key, label, icon: Icon, view }) => {
        const value =
          key === "upcoming_appointments" ? upcomingCount : summary[key as keyof ClinicalVisitsSummaryResponse];
        const isActive = view != null && activeView === view;
        const interactive = Boolean(onViewSelect && view);

        const card = (
          <div
            className={cn(
              "rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm",
              interactive && "cursor-pointer transition-shadow hover:shadow-md",
              isActive && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary/70" aria-hidden />
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        );

        if (!interactive || !view) {
          return <div key={key}>{card}</div>;
        }

        return (
          <button
            key={key}
            type="button"
            className="text-left"
            aria-pressed={isActive}
            onClick={() => onViewSelect?.(view)}
          >
            {card}
          </button>
        );
      })}
    </section>
  );
}

export function VisitsSummaryCardsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-xl border border-border/60 bg-muted/40" />
      ))}
    </section>
  );
}
