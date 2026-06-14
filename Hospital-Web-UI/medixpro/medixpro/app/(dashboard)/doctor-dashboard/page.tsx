"use client";

import { ArrowUpRight, CalendarClock, ClipboardList, FileText, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorScheduleTab } from "@/components/doctor/doctor-schedule-tab";
import type { ScheduleAppointmentRow } from "@/components/doctor/doctor-schedule-appointments-list";
import type { ScheduleMetrics } from "@/components/doctor/doctor-schedule-metrics-strip";
import type { ScheduleQueueSnapshot, ScheduleQueueTokenRow } from "@/components/doctor/doctor-schedule-queue-panel";
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

const MOCK_SCHEDULE_METRICS: ScheduleMetrics = {
  scheduled: 12,
  completed: 4,
  waiting: 5,
  cancelled: 1,
  noShow: 0,
};

const MOCK_SCHEDULE_APPOINTMENTS: ScheduleAppointmentRow[] = [
  { id: "1", time: "09:00 AM", patientName: "Amit Patil", type: "Follow-up", status: "Completed" },
  { id: "2", time: "10:00 AM", patientName: "Rachana Lambe", type: "New", status: "Waiting" },
  { id: "3", time: "10:30 AM", patientName: "Priya Sharma", type: "Consultation", status: "In Progress" },
  { id: "4", time: "11:00 AM", patientName: "Ramesh Patil", type: "Follow-up", status: "Scheduled" },
  { id: "5", time: "11:30 AM", patientName: "Sneha Desai", type: "New", status: "Scheduled" },
  { id: "6", time: "02:00 PM", patientName: "Vikram Singh", type: "Consultation", status: "Scheduled" },
];

const MOCK_QUEUE_SNAPSHOT: ScheduleQueueSnapshot = {
  waiting: 5,
  vitalsDone: 2,
  readyForConsultation: 1,
};

const MOCK_QUEUE_TOKENS: ScheduleQueueTokenRow[] = [
  { id: "q1", token: "Token 1", patientName: "Rachana Lambe", status: "vitals_done" },
  { id: "q2", token: "Token 2", patientName: "Amit Patil", status: "waiting" },
  { id: "q3", token: "Token 3", patientName: "Priya Sharma", status: "waiting" },
  { id: "q4", token: "Token 4", patientName: "Sneha Desai", status: "waiting" },
  { id: "q5", token: "Token 5", patientName: "Vikram Singh", status: "waiting" },
];

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
      <main className="flex-1 space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{getWelcomeMessage()}</h2>
          <p className="text-muted-foreground">Here's what's happening with your patients today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Appointments Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Appointments</span>
            </div>
            <span className="text-sm text-red-500 font-medium">3 urgent</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">12</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Today's consultations</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              <span>View Schedule</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Reports Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Pending Reports</span>
            </div>
            <span className="text-sm text-emerald-500 font-medium">2 ready</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">7</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lab results awaiting review</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
              <span>Review Reports</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Patients Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-amber-100 dark:border-amber-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Active Patients</span>
            </div>
            <span className="text-sm text-amber-500 font-medium">8 new</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">143</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total patient count this week</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-amber-600 dark:text-amber-400 font-medium hover:underline">
              <span>Patient Records</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tasks Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-rose-100 dark:border-rose-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Pending Tasks</span>
            </div>
            <span className="text-sm text-rose-500 font-medium">2 high priority</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">5</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasks requiring attention</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-rose-600 dark:text-rose-400 font-medium hover:underline">
              <span>View Tasks</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:w-[480px]">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="practice-overview">Practice Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <DoctorScheduleTab
              metrics={MOCK_SCHEDULE_METRICS}
              appointments={MOCK_SCHEDULE_APPOINTMENTS}
              queueSnapshot={MOCK_QUEUE_SNAPSHOT}
              queueTokens={MOCK_QUEUE_TOKENS}
            />
          </TabsContent>

          <TabsContent value="patients" className="space-y-4">
            <DoctorPatientsTab
              patients={MOCK_RECENT_PATIENTS}
              insights={MOCK_PATIENT_INSIGHTS}
              followUpPatients={MOCK_FOLLOW_UP_PATIENTS}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <DoctorReportsTab
              reports={MOCK_REPORTS}
              insights={MOCK_REPORT_INSIGHTS}
              activity={MOCK_REPORT_ACTIVITY}
            />
          </TabsContent>

          <TabsContent value="practice-overview" className="space-y-4">
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
