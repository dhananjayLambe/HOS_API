"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText, Stethoscope, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DoctorDashboardSummaryCards,
  type DoctorDashboardMetric,
} from "@/components/doctor/doctor-dashboard-summary-cards";
import { DoctorScheduleTab } from "@/components/doctor/doctor-schedule-tab";
import { DoctorPatientsTab } from "@/components/doctor/doctor-patients-tab";
import type { RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";
import type { FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import { DoctorReportsTab } from "@/components/doctor/doctor-reports-tab";
import type { DoctorReportRow } from "@/components/doctor/doctor-reports-table";
import { DoctorPracticeOverviewTab } from "@/components/doctor/doctor-practice-overview-tab";
import type { PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import type { ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import type { PracticeSummary } from "@/components/doctor/doctor-practice-summary";
import type { ConsultationOverview } from "@/components/doctor/doctor-consultation-overview";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useAuth } from "@/lib/authContext";
import { useDoctorPatientsTab } from "@/hooks/useDoctorPatientsTab";
import { useDoctorPendingReports } from "@/hooks/useDoctorPendingReports";
import { useDoctorReportsTab } from "@/hooks/useDoctorReportsTab";
import { useDoctorScheduleTab } from "@/hooks/useDoctorScheduleTab";
import { downloadDoctorReport } from "@/lib/doctor/downloadDoctorReport";
import { usePatient } from "@/lib/patientContext";


const MOCK_PRACTICE_METRICS: PracticeMetrics = {
  patientsToday: 12,
  patientsThisWeek: 68,
  patientVisitsThisMonth: 284,
  followUpsCompleted: 24,
  consultationsCompleted: 18,
};

const MOCK_CONSULTATION_MIX: ConsultationMix = {
  newConsultations: 10,
  followUpConsultations: 8,
  cancelled: 1,
  noShow: 0,
};

const MOCK_PRACTICE_SUMMARY: PracticeSummary = {
  newPatients: 15,
  returningPatients: 269,
  activeTreatments: 42,
  patientsUnderTreatment: 42,
};

const MOCK_CONSULTATION_OVERVIEW: ConsultationOverview = {
  completed: 18,
  followUp: 8,
  newConsultations: 10,
  cancelled: 1,
  noShow: 0,
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const toast = useToastNotification();
  const { setSelectedPatient } = usePatient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("schedule");
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const schedule = useDoctorScheduleTab();
  const pendingReports = useDoctorPendingReports();
  const patientsTab = useDoctorPatientsTab({ enabled: activeTab === "patients" });
  const reportsTab = useDoctorReportsTab({ enabled: activeTab === "reports" });

  const selectPatientFromRow = useCallback(
    (row: RecentPatientRow) => {
      const [firstName = "", ...rest] = row.patientName.split(" ");
      setSelectedPatient({
        id: row.id,
        first_name: firstName,
        last_name: rest.join(" "),
        full_name: row.patientName,
        mobile: row.mobile,
        relation: "self",
      });
    },
    [setSelectedPatient]
  );

  const handleViewPatient = useCallback(
    (row: RecentPatientRow) => {
      selectPatientFromRow(row);
      router.push(`/patients/${row.id}`);
    },
    [router, selectPatientFromRow]
  );

  const handleViewVisitHistory = useCallback(
    (row: RecentPatientRow) => {
      selectPatientFromRow(row);
      router.push(`/patients/${row.id}?tab=visits`);
    },
    [router, selectPatientFromRow]
  );

  const handleStartConsultation = useCallback(
    (row: RecentPatientRow) => {
      selectPatientFromRow(row);
      router.push("/consultations/start-consultation");
    },
    [router, selectPatientFromRow]
  );

  const handleFollowUpPatientView = useCallback(
    (row: FollowUpPatientRow) => {
      const [firstName = "", ...rest] = row.patientName.split(" ");
      setSelectedPatient({
        id: row.id,
        first_name: firstName,
        last_name: rest.join(" "),
        full_name: row.patientName,
        relation: "self",
      });
      router.push(`/patients/${row.id}`);
    },
    [router, setSelectedPatient]
  );

  const selectPatientFromReportRow = useCallback(
    (row: DoctorReportRow) => {
      const [firstName = "", ...rest] = row.patientName.split(" ");
      setSelectedPatient({
        id: row.patientId,
        first_name: firstName,
        last_name: rest.join(" "),
        full_name: row.patientName,
        relation: "self",
      });
    },
    [setSelectedPatient]
  );

  const handleOpenReportPatient = useCallback(
    (row: DoctorReportRow) => {
      selectPatientFromReportRow(row);
      router.push(`/patients/${row.patientId}`);
    },
    [router, selectPatientFromReportRow]
  );

  const handleOpenReport = useCallback(
    (row: DoctorReportRow) => {
      if (!row.reportId) return;
      selectPatientFromReportRow(row);
      router.push(`/patients/${row.patientId}?tab=labs`);
    },
    [router, selectPatientFromReportRow]
  );

  const handleDownloadReport = useCallback(
    async (row: DoctorReportRow) => {
      if (!row.reportId) {
        toast.warning("This report is not available for download yet.");
        return;
      }

      setDownloadingReportId(row.reportId);
      try {
        await downloadDoctorReport(row.reportId, {
          fileName: `${row.reportType}.pdf`,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Unable to download report. Please try again."
        );
      } finally {
        setDownloadingReportId(null);
      }
    },
    [toast]
  );

  const dashboardMetrics = useMemo<DoctorDashboardMetric[]>(
    () => [
      {
        title: "Today's Appointments",
        value: schedule.error ? 0 : schedule.totalAppointments,
        supportingText: "Scheduled today",
        icon: Calendar,
        accent: "blue",
        loading: schedule.loading,
      },
      {
        title: "Patients Waiting",
        value: schedule.error ? 0 : schedule.metrics.waiting,
        supportingText: "Checked in today",
        icon: Users,
        accent: "orange",
        loading: schedule.loading,
      },
      {
        title: "Pending Reports",
        value: pendingReports.error ? "—" : pendingReports.pendingReports,
        supportingText: pendingReports.error ? "Unavailable" : "Awaiting review",
        icon: FileText,
        accent: "green",
        loading: pendingReports.loading,
        unavailable: Boolean(pendingReports.error),
      },
      {
        title: "Completed Consultations",
        value: schedule.error ? 0 : schedule.metrics.completed,
        supportingText: "Completed today",
        icon: Stethoscope,
        accent: "purple",
        loading: schedule.loading,
      },
    ],
    [
      schedule.totalAppointments,
      schedule.metrics.waiting,
      schedule.metrics.completed,
      schedule.loading,
      schedule.error,
      pendingReports.pendingReports,
      pendingReports.loading,
      pendingReports.error,
    ]
  );

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  
  // Build welcome message with user's name
  const getWelcomeMessage = () => {
    if (user?.first_name || user?.last_name) {
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return `Welcome back, Dr. ${fullName}`;
    }
    return "Welcome back, Doctor";
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 space-y-8">
        <div className="flex flex-col space-y-1">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">{getWelcomeMessage()}</h2>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your patients today.</p>
          <p className="text-sm text-muted-foreground/80">{todayLabel}</p>
        </div>

        <DoctorDashboardSummaryCards metrics={dashboardMetrics} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto grid-cols-4 gap-1 rounded-xl bg-muted/40 p-1.5 md:w-[520px]">
            <TabsTrigger
              value="schedule"
              className="h-11 rounded-xl font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60"
            >
              Schedule
            </TabsTrigger>
            <TabsTrigger
              value="patients"
              className="h-11 rounded-xl font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60"
            >
              Patients
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="h-11 rounded-xl font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="practice-overview"
              className="h-11 rounded-xl font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60"
            >
              Practice Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <DoctorScheduleTab
              metrics={schedule.metrics}
              appointments={schedule.appointments}
              queueSnapshot={schedule.queueSnapshot}
              queueTokens={schedule.queueTokens}
              totalAppointments={schedule.totalAppointments}
              loading={schedule.loading}
              error={schedule.error}
              metricsError={schedule.metricsError}
              onRetry={schedule.refetch}
            />
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <DoctorPatientsTab
              patients={patientsTab.patients}
              insights={patientsTab.insights}
              followUpPatients={patientsTab.followUpPatients}
              loading={patientsTab.loading}
              error={patientsTab.error}
              page={patientsTab.page}
              pageSize={patientsTab.pageSize}
              totalCount={patientsTab.totalCount}
              pageSizeOptions={patientsTab.pageSizeOptions}
              onPageChange={patientsTab.setPage}
              onPageSizeChange={patientsTab.setPageSize}
              onRetry={patientsTab.refetch}
              onViewPatient={handleViewPatient}
              onViewVisitHistory={handleViewVisitHistory}
              onStartConsultation={handleStartConsultation}
              onFollowUpPatientView={handleFollowUpPatientView}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <DoctorReportsTab
              reports={reportsTab.reports}
              insights={reportsTab.insights}
              activity={reportsTab.activity}
              loading={reportsTab.loading}
              isRefreshing={reportsTab.isRefreshing}
              downloadingReportId={downloadingReportId}
              error={reportsTab.error}
              page={reportsTab.page}
              pageSize={reportsTab.pageSize}
              totalCount={reportsTab.totalCount}
              pageSizeOptions={reportsTab.pageSizeOptions}
              onPageChange={reportsTab.setPage}
              onPageSizeChange={reportsTab.setPageSize}
              onRetry={reportsTab.refetch}
              onOpenPatient={handleOpenReportPatient}
              onOpenReport={handleOpenReport}
              onDownloadReport={handleDownloadReport}
            />
          </TabsContent>

          <TabsContent value="practice-overview" className="space-y-6">
            <DoctorPracticeOverviewTab
              metrics={MOCK_PRACTICE_METRICS}
              consultationMix={MOCK_CONSULTATION_MIX}
              summary={MOCK_PRACTICE_SUMMARY}
              consultations={MOCK_CONSULTATION_OVERVIEW}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
