"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, FileText, Stethoscope, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DoctorDashboardSummaryCards,
  type DoctorDashboardMetric,
} from "@/components/doctor/doctor-dashboard-summary-cards";
import { DoctorScheduleTab } from "@/components/doctor/doctor-schedule-tab";
import type { ScheduleAppointmentRow } from "@/components/doctor/doctor-schedule-appointments-list";
import type { ScheduleQueueTokenRow } from "@/components/doctor/doctor-schedule-queue-panel";
import { DoctorPatientsTab } from "@/components/doctor/doctor-patients-tab";
import type { RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";
import type { FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import { DoctorReportsTab } from "@/components/doctor/doctor-reports-tab";
import type { DoctorReportRow } from "@/components/doctor/doctor-reports-table";
import { DoctorPracticeOverviewTab } from "@/components/doctor/doctor-practice-overview-tab";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useAuth } from "@/lib/authContext";
import { useDoctorPatientsTab } from "@/hooks/useDoctorPatientsTab";
import { useDoctorPendingReports } from "@/hooks/useDoctorPendingReports";
import { useDoctorPracticeOverviewTab } from "@/hooks/useDoctorPracticeOverviewTab";
import { useDoctorReportsTab } from "@/hooks/useDoctorReportsTab";
import { useDoctorScheduleTab } from "@/hooks/useDoctorScheduleTab";
import { downloadDoctorReport } from "@/lib/doctor/downloadDoctorReport";
import { usePatient } from "@/lib/patientContext";

const DASHBOARD_TABS = ["schedule", "patients", "reports", "practice-overview"] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

function isDashboardTab(value: string | null): value is DashboardTab {
  return Boolean(value && (DASHBOARD_TABS as readonly string[]).includes(value));
}

function resolveTabFromSearchParams(searchParams: URLSearchParams): DashboardTab {
  const tab = searchParams.get("tab");
  if (isDashboardTab(tab)) return tab;
  if (searchParams.get("queue") === "open") return "schedule";
  if (searchParams.get("search") === "patient") return "patients";
  return "schedule";
}

function DoctorDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  const { setSelectedPatient } = usePatient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    resolveTabFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [highlightQueue, setHighlightQueue] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const schedule = useDoctorScheduleTab();
  const pendingReports = useDoctorPendingReports();
  const patientsTab = useDoctorPatientsTab({ enabled: activeTab === "patients" });
  const reportsTab = useDoctorReportsTab({ enabled: activeTab === "reports" });
  const practiceOverviewTab = useDoctorPracticeOverviewTab({
    enabled: activeTab === "practice-overview",
  });

  const replaceDashboardParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const query = next.toString();
      router.replace(query ? `/doctor-dashboard?${query}` : "/doctor-dashboard", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    // Deep link: Search Patient should land on the searchable patients list.
    if (searchParams.get("search") === "patient") {
      router.replace("/patients");
      return;
    }

    const resolved = resolveTabFromSearchParams(searchParams);
    setActiveTab(resolved);

    const queueOpen = searchParams.get("queue") === "open";
    const focusQueue = searchParams.get("focus") === "queue" || queueOpen;
    setHighlightQueue(focusQueue);

    const tabParam = searchParams.get("tab");
    if (queueOpen || (!isDashboardTab(tabParam) && searchParams.toString())) {
      replaceDashboardParams((next) => {
        next.set("tab", resolved);
        next.delete("queue");
        next.delete("search");
        if (focusQueue) {
          next.set("focus", "queue");
        } else {
          next.delete("focus");
        }
      });
    }
  }, [replaceDashboardParams, router, searchParams]);

  useEffect(() => {
    if (!highlightQueue || activeTab !== "schedule") return;
    const timer = window.setTimeout(() => {
      document.getElementById("doctor-schedule-queue")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [activeTab, highlightQueue, schedule.loading]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isDashboardTab(value)) return;
      setActiveTab(value);
      setHighlightQueue(false);
      replaceDashboardParams((next) => {
        next.set("tab", value);
        next.delete("queue");
        next.delete("search");
        next.delete("focus");
      });
    },
    [replaceDashboardParams]
  );

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

  const selectPatientById = useCallback(
    (patientId: string, patientName: string, mobile?: string) => {
      const [firstName = "", ...rest] = patientName.split(" ");
      setSelectedPatient({
        id: patientId,
        first_name: firstName,
        last_name: rest.join(" "),
        full_name: patientName,
        mobile,
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

  const handleViewAppointmentPatient = useCallback(
    (appointment: ScheduleAppointmentRow) => {
      if (!appointment.patientId) return;
      selectPatientById(appointment.patientId, appointment.patientName);
      router.push(`/patients/${appointment.patientId}`);
    },
    [router, selectPatientById]
  );

  const handleStartAppointmentConsultation = useCallback(
    (appointment: ScheduleAppointmentRow) => {
      if (!appointment.patientId) return;
      selectPatientById(appointment.patientId, appointment.patientName);
      router.push("/consultations/start-consultation");
    },
    [router, selectPatientById]
  );

  const handleViewQueuePatient = useCallback(
    (token: ScheduleQueueTokenRow) => {
      if (!token.patientId) return;
      selectPatientById(token.patientId, token.patientName);
      router.push(`/patients/${token.patientId}`);
    },
    [router, selectPatientById]
  );

  const handleStartQueueConsultation = useCallback(
    (token: ScheduleQueueTokenRow) => {
      if (!token.patientId) return;
      selectPatientById(token.patientId, token.patientName);
      router.push("/consultations/start-consultation");
    },
    [router, selectPatientById]
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
        value: schedule.error ? "—" : schedule.totalAppointments,
        supportingText: schedule.error ? "Unavailable" : "Appointments today",
        icon: Calendar,
        accent: "blue",
        loading: schedule.loading,
        unavailable: Boolean(schedule.error),
      },
      {
        title: "Patients Waiting",
        value: schedule.error ? "—" : schedule.metrics.waiting,
        supportingText: schedule.error ? "Unavailable" : "Checked in today",
        icon: Users,
        accent: "orange",
        loading: schedule.loading,
        unavailable: Boolean(schedule.error),
      },
      {
        title: "Pending Reports",
        value: pendingReports.error ? "—" : pendingReports.pendingReports,
        supportingText: pendingReports.error ? "Unavailable" : "Awaiting review",
        icon: FileText,
        accent: "green",
        loading: pendingReports.loading,
        unavailable: Boolean(pendingReports.error),
        onRetry: pendingReports.error ? () => void pendingReports.refetch() : undefined,
      },
      {
        title: "Completed Consultations",
        value: schedule.error ? "—" : schedule.metrics.completed,
        supportingText: schedule.error ? "Unavailable" : "Completed today",
        icon: Stethoscope,
        accent: "purple",
        loading: schedule.loading,
        unavailable: Boolean(schedule.error),
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
      pendingReports.refetch,
    ]
  );

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
              queueError={schedule.queueError}
              highlightQueue={highlightQueue}
              onRetry={schedule.refetch}
              onViewAppointmentPatient={handleViewAppointmentPatient}
              onStartAppointmentConsultation={handleStartAppointmentConsultation}
              onViewQueuePatient={handleViewQueuePatient}
              onStartQueueConsultation={handleStartQueueConsultation}
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
              metrics={practiceOverviewTab.metrics}
              consultationMix={practiceOverviewTab.consultationMix}
              summary={practiceOverviewTab.summary}
              recentTrends={practiceOverviewTab.recentTrends}
              generatedAt={practiceOverviewTab.generatedAt}
              loading={practiceOverviewTab.loading}
              error={practiceOverviewTab.error}
              onRetry={practiceOverviewTab.refetch}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function DoctorDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>}>
      <DoctorDashboardPageContent />
    </Suspense>
  );
}
