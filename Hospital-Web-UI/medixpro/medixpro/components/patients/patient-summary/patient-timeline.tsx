"use client";

import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { FlaskConical } from "lucide-react";

type TimelineEvent = PatientSummaryPayload["timeline"][number];

type Props = {
  events: TimelineEvent[];
  onOpenLabReport?: (reportId: string) => void;
  onOpenLabHistory?: () => void;
};

export function PatientTimeline({ events, onOpenLabReport, onOpenLabHistory }: Props) {
  return (
    <section className="space-y-5">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Timeline</h3>
      <div className="space-y-5">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No timeline events yet.</p>
        ) : (
          events.map((event) => {
            const isLab = event.kind === "lab_report";
            return (
              <div key={event.id} className="relative border-l border-slate-200/40 pl-5">
                <span
                  className={
                    isLab
                      ? "absolute -left-[5px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400"
                      : "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300"
                  }
                />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      {isLab ? <FlaskConical className="h-3.5 w-3.5 text-amber-600" /> : null}
                      {event.event}
                    </p>
                    <p className="text-xs text-slate-500">{event.date_label}</p>
                    <p className="mt-1 text-sm text-slate-600">{event.detail}</p>
                  </div>
                  {isLab ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary/80 hover:text-primary"
                      onClick={() => {
                        if (event.report_id && onOpenLabReport) {
                          onOpenLabReport(event.report_id);
                        } else {
                          onOpenLabHistory?.();
                        }
                      }}
                    >
                      Open →
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
