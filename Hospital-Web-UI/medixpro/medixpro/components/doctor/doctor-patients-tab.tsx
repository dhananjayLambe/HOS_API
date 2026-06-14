"use client";

import { AlertCircle } from "lucide-react";
import { DoctorPatientInsightsPanel, type PatientInsightMetrics } from "@/components/doctor/doctor-patient-insights-panel";
import { DoctorPatientsFollowUpList, type FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import { DoctorPatientsRecentTable, type RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";
import { Button } from "@/components/ui/button";
import type { DoctorPatientsPageSize } from "@/lib/api/doctor-patients-dashboard";

export type DoctorPatientsTabProps = {
  patients: RecentPatientRow[];
  insights: PatientInsightMetrics;
  followUpPatients: FollowUpPatientRow[];
  loading?: boolean;
  error?: string | null;
  page?: number;
  pageSize?: DoctorPatientsPageSize;
  totalCount?: number;
  pageSizeOptions?: readonly DoctorPatientsPageSize[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: DoctorPatientsPageSize) => void;
  onRetry?: () => void;
  onViewPatient?: (patient: RecentPatientRow) => void;
  onViewVisitHistory?: (patient: RecentPatientRow) => void;
  onStartConsultation?: (patient: RecentPatientRow) => void;
  onFollowUpPatientView?: (patient: FollowUpPatientRow) => void;
};

export function DoctorPatientsTab({
  patients,
  insights,
  followUpPatients,
  loading,
  error,
  page,
  pageSize,
  totalCount,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onViewPatient,
  onViewVisitHistory,
  onStartConsultation,
  onFollowUpPatientView,
}: DoctorPatientsTabProps) {
  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={() => void onRetry()}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorPatientsRecentTable
            patients={patients}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onViewPatient={onViewPatient}
            onViewVisitHistory={onViewVisitHistory}
            onStartConsultation={onStartConsultation}
          />
        </div>
        <div className="space-y-4 lg:col-span-3">
          <DoctorPatientInsightsPanel insights={insights} loading={loading} />
          <DoctorPatientsFollowUpList
            patients={followUpPatients}
            loading={loading}
            onViewPatient={onFollowUpPatientView}
          />
        </div>
      </div>
    </div>
  );
}
