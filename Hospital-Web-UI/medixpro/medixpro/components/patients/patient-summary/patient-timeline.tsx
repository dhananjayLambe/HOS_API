import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";

type Props = {
  events: PatientSummaryPayload["timeline"];
};

export function PatientTimeline({ events }: Props) {
  return (
    <section className="space-y-5">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Timeline</h3>
      <div className="space-y-5">
        {events.map((event) => (
          <div key={event.id} className="relative border-l border-slate-200/40 pl-5">
            <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
            <p className="text-sm font-medium text-slate-900">{event.event}</p>
            <p className="text-xs text-slate-500">{event.date_label}</p>
            <p className="mt-1 text-sm text-slate-600">{event.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
