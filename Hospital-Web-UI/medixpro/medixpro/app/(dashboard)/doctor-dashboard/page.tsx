"use client";

import { useMemo } from "react";
import { Calendar, FileText, Stethoscope, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DoctorDashboardSummaryCards,
  type DoctorDashboardMetric,
} from "@/components/doctor/doctor-dashboard-summary-cards";
import { DoctorScheduleTab } from "@/components/doctor/doctor-schedule-tab";
import { DoctorPatientsTab } from "@/components/doctor/doctor-patients-tab";
import type { RecentPatientRow } from "@/components/doctor/doctor-patients-recent-table";
import type { PatientInsightMetrics } from "@/components/doctor/doctor-patient-insights-panel";
import type { FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import { DoctorReportsTab } from "@/components/doctor/doctor-reports-tab";
import type { DoctorReportRow } from "@/components/doctor/doctor-reports-table";
import type { ReportInsightMetrics } from "@/components/doctor/doctor-report-insights";
import type { ReportActivityItem } from "@/components/doctor/doctor-recent-report-activity";
import { DoctorPracticeOverviewTab } from "@/components/doctor/doctor-practice-overview-tab";
import type { PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import type { ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import type { PracticeSummary } from "@/components/doctor/doctor-practice-summary";
import type { ConsultationOverview } from "@/components/doctor/doctor-consultation-overview";
import { useAuth } from "@/lib/authContext";
import { useDoctorPendingReports } from "@/hooks/useDoctorPendingReports";
import { useDoctorScheduleTab } from "@/hooks/useDoctorScheduleTab";


const MOCK_RECENT_PATIENTS: RecentPatientRow[] = [
  { id: "p1", patientName: "Rachana Lambe", lastVisit: "Today", diagnosis: "Viral Fever", status: "Active" },
  { id: "p2", patientName: "Amit Patil", lastVisit: "Yesterday", diagnosis: "Diabetes", status: "Follow-up Due" },
  { id: "p3", patientName: "Priya Sharma", lastVisit: "2 Days Ago", diagnosis: "Hypertension", status: "Stable" },
  { id: "p4", patientName: "Ramesh Patil", lastVisit: "3 Days Ago", diagnosis: "Asthma", status: "Treatment Ongoing" },
  { id: "p5", patientName: "Sneha Desai", lastVisit: "5 Days Ago", diagnosis: "Migraine", status: "Stable" },
];

const MOCK_PATIENT_INSIGHTS: PatientInsightMetrics = {
  patientsSeenToday: 12,
  followUpDue: 8,
  treatmentOngoing: 15,
};

const MOCK_FOLLOW_UP_PATIENTS: FollowUpPatientRow[] = [
  { id: "f1", patientName: "Amit Patil", lastVisitAgo: "15 days ago" },
  { id: "f2", patientName: "Priya Sharma", lastVisitAgo: "30 days ago" },
  { id: "f3", patientName: "Ramesh Patil", lastVisitAgo: "45 days ago" },
];

const MOCK_REPORTS: DoctorReportRow[] = [
  { id: "r1", patientName: "Rachana Lambe", reportType: "CBC Report", uploaded: "Today", reviewStatus: "Ready For Review" },
  { id: "r2", patientName: "Amit Patil", reportType: "Lipid Profile", uploaded: "Today", reviewStatus: "Reviewed" },
  { id: "r3", patientName: "Priya Sharma", reportType: "Thyroid Profile", uploaded: "Yesterday", reviewStatus: "Ready For Review" },
  { id: "r4", patientName: "Ramesh Patil", reportType: "Chest X-Ray", uploaded: "Yesterday", reviewStatus: "Pending Upload" },
];

const MOCK_REPORT_INSIGHTS: ReportInsightMetrics = {
  readyForReview: 7,
  reviewedToday: 12,
  pendingUpload: 3,
  reportsReceivedToday: 15,
};

const MOCK_REPORT_ACTIVITY: ReportActivityItem[] = [
  { id: "a1", description: "CBC Report uploaded", patientName: "Rachana Lambe", timestamp: "09:30 AM" },
  { id: "a2", description: "Thyroid Profile reviewed", patientName: "Priya Sharma", timestamp: "10:15 AM" },
  { id: "a3", description: "Chest X-Ray pending", patientName: "Ramesh Patil", timestamp: "Yesterday" },
  { id: "a4", description: "Lipid Profile reviewed", patientName: "Amit Patil", timestamp: "08:45 AM" },
];

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
  const { user } = useAuth();
  const schedule = useDoctorScheduleTab();
  const pendingReports = useDoctorPendingReports();

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
        value: pendingReports.error ? 0 : pendingReports.pendingReports,
        supportingText: "Awaiting review",
        icon: FileText,
        accent: "green",
        loading: pendingReports.loading,
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

        <Tabs defaultValue="schedule" className="space-y-6">
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
              patients={MOCK_RECENT_PATIENTS}
              insights={MOCK_PATIENT_INSIGHTS}
              followUpPatients={MOCK_FOLLOW_UP_PATIENTS}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <DoctorReportsTab
              reports={MOCK_REPORTS}
              insights={MOCK_REPORT_INSIGHTS}
              activity={MOCK_REPORT_ACTIVITY}
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
