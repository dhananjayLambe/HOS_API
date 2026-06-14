"use client";

import { DoctorRecentReportActivity, type ReportActivityItem } from "@/components/doctor/doctor-recent-report-activity";
import { DoctorReportInsights, type ReportInsightMetrics } from "@/components/doctor/doctor-report-insights";
import { DoctorReportsTable, type DoctorReportRow } from "@/components/doctor/doctor-reports-table";

export type DoctorReportsTabProps = {
  reports: DoctorReportRow[];
  insights: ReportInsightMetrics;
  activity: ReportActivityItem[];
};

export function DoctorReportsTab({ reports, insights, activity }: DoctorReportsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-10">
      <div className="lg:col-span-7">
        <DoctorReportsTable reports={reports} />
      </div>
      <div className="space-y-4 lg:col-span-3">
        <DoctorReportInsights insights={insights} />
        <DoctorRecentReportActivity activity={activity} />
      </div>
    </div>
  );
}
