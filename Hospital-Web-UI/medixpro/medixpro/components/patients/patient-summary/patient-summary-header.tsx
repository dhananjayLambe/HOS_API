"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { getInitials } from "@/lib/patientAvatar";

type Props = {
  payload: PatientSummaryPayload;
  onStartConsultation: () => void;
  onViewPrescriptions: () => void;
  onViewLabs: () => void;
};

export function PatientSummaryHeader({ payload, onStartConsultation, onViewPrescriptions, onViewLabs }: Props) {
  const { patient, quick_stats } = payload;
  const badges: Array<{ key: string; label: string; show: boolean }> = [
    { key: "consultation_active", label: "Consultation Active", show: patient.open_encounter_state === "consultation_active" },
    { key: "in_queue", label: "In Queue", show: patient.open_encounter_state === "in_queue" },
    { key: "follow_up_due", label: "Follow-up Due", show: patient.is_follow_up_due },
    { key: "recent_visit", label: "Recent Visit", show: quick_stats.last_visit_label === "Today" },
  ];
  const topBadges = badges.filter((b) => b.show).slice(0, 2);
  const consultLabel = patient.has_open_encounter || patient.has_unfinished_consultation ? "Continue Consultation" : "Start Consultation";
  const primaryState = patient.open_encounter_state === "consultation_active"
    ? "Consultation in progress"
    : patient.open_encounter_state === "in_queue"
      ? "Patient in queue"
      : patient.is_follow_up_due
        ? "Follow-up due"
        : "Stable clinical state";

  return (
    <section className="rounded-2xl border border-slate-200/40 bg-white/90 px-6 py-5 backdrop-blur-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(patient.full_name)}
          </div>
            <div className="min-w-0 space-y-3">
              <p className="truncate text-[28px] font-semibold leading-none tracking-tight text-slate-900">{patient.full_name}</p>
              <p className="truncate text-sm text-slate-500">
                {patient.age_display} • {patient.gender} • {patient.mobile} • UHID {patient.uhid}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
              {topBadges.map((badge) => (
                  <Badge
                    key={badge.key}
                    variant="outline"
                    className="h-5 rounded-md border-slate-200/40 bg-white px-2 text-[10px] font-medium text-slate-600"
                  >
                  {badge.label}
                </Badge>
              ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700">{quick_stats.visits} Visits</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{quick_stats.active_rx} Active RX</span>
                <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">{quick_stats.pending_labs} Pending Labs</span>
                <span className="rounded-md bg-slate-100/70 px-2 py-1 text-[11px] text-slate-600">Seen {quick_stats.last_visit_label}</span>
              </div>
              <p className="text-xs text-slate-500">{primaryState}</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-start">
            <Button className="min-h-[44px] bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90" onClick={onStartConsultation}>
            {consultLabel}
          </Button>
            <Button variant="ghost" className="min-h-[44px] px-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={onViewPrescriptions}>
            View Prescriptions
          </Button>
            <Button variant="ghost" className="min-h-[44px] px-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={onViewLabs}>
            View Labs
          </Button>
          </div>
      </div>
    </section>
  );
}
