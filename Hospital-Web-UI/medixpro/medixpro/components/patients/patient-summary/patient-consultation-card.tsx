import { Card, CardContent } from "@/components/ui/card";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";

type Consultation = PatientSummaryPayload["consultations"][number];

export function PatientConsultationCard({
  consultation,
  isLatest = false,
}: {
  consultation: Consultation;
  isLatest?: boolean;
}) {
  return (
    <Card
      className={
        isLatest
          ? "rounded-2xl border border-slate-300/60 bg-white shadow-none transition-colors hover:border-slate-300/70"
          : "rounded-2xl border border-slate-200/40 bg-white/85 shadow-none transition-colors hover:border-slate-200/60"
      }
    >
      <CardContent className="space-y-3 p-5">
        <p className="text-sm leading-6 text-slate-500">{consultation.date_label}</p>
        <p
          className={
            isLatest
              ? "line-clamp-2 text-[22px] font-medium tracking-tight text-slate-900"
              : "line-clamp-2 text-lg font-medium tracking-tight text-slate-900"
          }
        >
          {consultation.diagnosis}
        </p>
        <p className="text-sm leading-6 text-slate-600">Medicines: {consultation.medicines_summary}</p>
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">Advice: {consultation.advice}</p>
        <p className="text-sm leading-6 text-slate-500">Follow-up: {consultation.follow_up}</p>
      </CardContent>
    </Card>
  );
}
