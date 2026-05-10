"use client";

import type { LabTimelineEvent } from "@/lib/labs/types";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function LabActivityTimeline({
  events,
  className,
}: {
  events: LabTimelineEvent[];
  className?: string;
}) {
  if (!events.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-[#ECEBFF] bg-[#FAF9FF]/80 px-4 py-8 text-center",
          className
        )}
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1FF] text-[#7C5CFC]">
          <Activity className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <p className="text-sm font-medium text-[#111827]">No activity yet</p>
        <p className="mt-1 text-xs text-[#6B7280]">Events will appear here as the order moves through the lab.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative pl-2", className)}>
      <div
        className="pointer-events-none absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[#7C5CFC]/35 via-[#ECEBFF] to-[#ECEBFF]"
        aria-hidden
      />
      <ol className="space-y-3">
        {events.map((ev, i) => (
          <li key={`${ev.at}-${ev.label}-${i}`} className="relative flex gap-3 text-left">
            <div className="relative z-[1] mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#7C5CFC] shadow-[0_0_0_1px_rgba(124,92,252,0.2)]" />
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-xl border border-[#ECEBFF] bg-white px-3 py-2.5",
                "shadow-[0_4px_14px_rgba(124,92,252,0.06)] transition-[box-shadow,transform] duration-200 ease-out hover:shadow-[0_8px_24px_rgba(124,92,252,0.1)]"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{ev.at}</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug text-[#111827]">{ev.label}</p>
              {ev.actor ? <p className="mt-1 text-xs font-medium text-[#7C5CFC]">{ev.actor}</p> : null}
              {ev.detail ? <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{ev.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
