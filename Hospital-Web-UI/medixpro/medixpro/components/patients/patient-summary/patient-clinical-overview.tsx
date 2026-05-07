import { Card, CardContent } from "@/components/ui/card";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { PatientConsultationCard } from "./patient-consultation-card";
import { PatientGeneratedSummary } from "./patient-generated-summary";
import { PatientLabCard } from "./patient-lab-card";
import { PatientPrescriptionCard } from "./patient-prescription-card";

type Props = {
  payload: PatientSummaryPayload;
};

export function PatientClinicalOverview({ payload }: Props) {
  return (
    <div className="space-y-14">
      <PatientGeneratedSummary headline={payload.generated_summary.headline} summary={payload.generated_summary.summary} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/40 bg-white/80 shadow-none">
          <CardContent className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Last Diagnosis</p>
            <p className="mt-1 text-base font-medium tracking-tight text-slate-900">{payload.snapshot.last_diagnosis}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/40 bg-white/80 shadow-none">
          <CardContent className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Current Medications</p>
            <p className="mt-1 text-base font-medium tracking-tight text-slate-900">{payload.snapshot.current_medications}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/40 bg-white/80 shadow-none">
          <CardContent className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Follow-up</p>
            <p className="mt-1 text-base font-medium tracking-tight text-slate-900">{payload.snapshot.follow_up}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/40 bg-white/80 shadow-none">
          <CardContent className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Latest Lab</p>
            <p className="mt-1 text-base font-medium tracking-tight text-slate-900">{payload.snapshot.latest_lab}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-900">Recent Consultations</p>
          <p className="text-xs text-slate-500">View Full Timeline</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {payload.consultations.slice(0, 3).map((consultation, index) => (
            <PatientConsultationCard key={consultation.id} consultation={consultation} isLatest={index === 0} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-lg font-semibold tracking-tight text-slate-900">Active Prescriptions</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {payload.prescriptions.slice(0, 3).map((prescription) => (
            <PatientPrescriptionCard
              key={prescription.id}
              prescription={prescription}
              patientFullName={payload.patient.full_name}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-lg font-semibold tracking-tight text-slate-900">Latest Lab Reports</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {payload.labs.slice(0, 3).map((lab) => (
            <PatientLabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </section>
    </div>
  );
}
