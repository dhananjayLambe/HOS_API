"use client";

import {
  timelineDotColor,
  type ReportTimelineEventViewModel,
} from "@/lib/labs/reports/completion/build-report-timeline";
import { cn } from "@/lib/utils";

function TimelineSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-2">
          <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-[#E5E7EB]" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-28 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-[#F3F4F6]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEventRow({
  event,
  isLast,
}: {
  event: ReportTimelineEventViewModel;
  isLast: boolean;
}) {
  const dotColor = timelineDotColor(event.color);

  return (
    <li className="relative flex gap-2 pb-3 last:pb-0">
      {!isLast ? (
        <span
          className="absolute left-[3px] top-3 bottom-0 w-px bg-[#E5E7EB]"
          aria-hidden
        />
      ) : null}
      <span
        className="relative z-[1] mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#111827]">{event.label}</p>
        <p className="text-[11px] font-medium text-[#6B7280]">{event.atLabel}</p>
        {event.detail ? (
          <p className="mt-0.5 text-[11px] text-[#6B7280]">{event.detail}</p>
        ) : null}
      </div>
    </li>
  );
}

export function ReportTestTimeline({
  events,
  loading,
  error,
  className,
}: {
  events: ReportTimelineEventViewModel[];
  loading?: boolean;
  error?: string | null;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("mt-2 rounded-md border border-white/70 bg-white/70 p-2", className)}>
        <p className="text-[11px] font-medium text-[#6B7280]">Loading timeline...</p>
        <TimelineSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("mt-2 rounded-md border border-white/70 bg-white/70 p-2 text-xs text-red-700", className)}>
        {error}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className={cn("mt-2 rounded-md border border-white/70 bg-white/70 p-2 text-xs text-[#6B7280]", className)}>
        No timeline available.
      </div>
    );
  }

  return (
    <div className={cn("mt-2 rounded-md border border-white/70 bg-white/70 p-2", className)}>
      <ol className="relative pl-0.5">
        {events.map((event, index) => (
          <TimelineEventRow key={event.id} event={event} isLast={index === events.length - 1} />
        ))}
      </ol>
    </div>
  );
}
