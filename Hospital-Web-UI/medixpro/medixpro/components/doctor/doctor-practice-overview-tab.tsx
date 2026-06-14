"use client";

import { DoctorConsultationMix, type ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import { DoctorConsultationOverview, type ConsultationOverview } from "@/components/doctor/doctor-consultation-overview";
import { DoctorPracticeOverviewMetrics, type PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import { DoctorPracticeSummary, type PracticeSummary } from "@/components/doctor/doctor-practice-summary";

export type DoctorPracticeOverviewTabProps = {
  metrics: PracticeMetrics;
  consultationMix: ConsultationMix;
  summary: PracticeSummary;
  consultations: ConsultationOverview;
};

export function DoctorPracticeOverviewTab({
  metrics,
  consultationMix,
  summary,
  consultations,
}: DoctorPracticeOverviewTabProps) {
  return (
    <div className="space-y-4">
      <DoctorPracticeOverviewMetrics metrics={metrics} />
      <div className="grid gap-4 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorConsultationMix mix={consultationMix} />
        </div>
        <div className="lg:col-span-3">
          <DoctorPracticeSummary summary={summary} />
        </div>
      </div>
      <DoctorConsultationOverview consultations={consultations} />
    </div>
  );
}
