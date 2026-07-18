"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { PatientConsultationCard } from "./patient-consultation-card";
import { PatientGeneratedSummary } from "./patient-generated-summary";
import { PatientPrescriptionCard } from "./patient-prescription-card";
import {
  LabHistoryCard,
  useClinicalLabHistoryList,
  useClinicalLabHistorySummary,
} from "./clinical-lab-history";
import type { ClinicalLabHistoryItem } from "./clinical-lab-history/types";

type Props = {
  payload: PatientSummaryPayload;
  onViewLabs: () => void;
  onViewTimeline: () => void;
};

export function PatientClinicalOverview({ payload, onViewLabs, onViewTimeline }: Props) {
  const patientId = payload.patient.id;
  const summaryQuery = useClinicalLabHistorySummary(patientId);
  const listQuery = useClinicalLabHistoryList(patientId, { pageSize: 3 });
  const latestItems = listQuery.data?.pages[0]?.items.slice(0, 3) ?? [];

  const latestLabLabel = summaryQuery.data
    ? summaryQuery.data.latestLab
      ? summaryQuery.data.latestDate
        ? `${summaryQuery.data.latestLab} · ${summaryQuery.data.latestDate}`
        : summaryQuery.data.latestLab
      : "No lab data"
    : payload.snapshot.latest_lab;

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
            <p className="mt-1 text-base font-medium tracking-tight text-slate-900">{latestLabLabel}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-900">Recent Consultations</p>
          <button
            type="button"
            onClick={onViewTimeline}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            View Full Timeline
          </button>
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold tracking-tight text-slate-900">Latest Lab Reports</p>
          <button
            type="button"
            onClick={onViewLabs}
            className="text-xs font-medium text-primary/80 hover:text-primary"
          >
            View Lab History
          </button>
        </div>
        {listQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading lab reports…</p>
        ) : latestItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
            <p className="text-sm text-slate-600">
              No laboratory reports have been uploaded for this patient at this clinic.
            </p>
            <Link
              href={`/lab-tests-reports?patientId=${encodeURIComponent(patientId)}`}
              className="mt-3 inline-flex text-sm font-medium text-primary/80 hover:text-primary"
            >
              Advanced Report Workspace
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {latestItems.map((item: ClinicalLabHistoryItem) => (
              <LabHistoryCard
                key={item.id}
                item={item}
                compact
                patientId={patientId}
                onPreview={() => onViewLabs()}
                onOpenWorkspace={() => {
                  window.location.href = `/lab-tests-reports?patientId=${encodeURIComponent(patientId)}&reportId=${encodeURIComponent(item.id)}`;
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
