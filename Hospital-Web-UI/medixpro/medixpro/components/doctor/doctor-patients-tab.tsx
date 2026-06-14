"use client";

import { DoctorPatientInsightsPanel, type PatientInsightMetrics } from "@/components/doctor/doctor-patient-insights-panel";
import { DoctorPatientsFollowUpList, type FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import { DoctorPatientsRecentTable, type RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";

export type DoctorPatientsTabProps = {
  patients: RecentPatientRow[];
  insights: PatientInsightMetrics;
  followUpPatients: FollowUpPatientRow[];
};

export function DoctorPatientsTab({ patients, insights, followUpPatients }: DoctorPatientsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-10">
      <div className="lg:col-span-7">
        <DoctorPatientsRecentTable patients={patients} />
      </div>
      <div className="space-y-4 lg:col-span-3">
        <DoctorPatientInsightsPanel insights={insights} />
        <DoctorPatientsFollowUpList patients={followUpPatients} />
      </div>
    </div>
  );
}
