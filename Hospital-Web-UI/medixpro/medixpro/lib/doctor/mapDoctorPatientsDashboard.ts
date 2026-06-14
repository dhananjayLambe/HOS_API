import type { PatientInsightMetrics } from "@/components/doctor/doctor-patient-insights-panel";
import type { FollowUpPatientRow } from "@/components/doctor/doctor-patients-follow-up-list";
import type {
  RecentPatientRow,
  RecentPatientStatus,
} from "@/components/doctor/doctor-patients-recent-table";
import type { DoctorPatientsDashboardData } from "@/lib/api/doctor-patients-dashboard";

const STATUS_MAP: Record<string, RecentPatientStatus> = {
  ACTIVE: "Active",
  FOLLOW_UP_DUE: "Follow-up Due",
  TREATMENT_ONGOING: "Treatment Ongoing",
  STABLE: "Stable",
};

function formatLastVisit(isoDate: string | null): string {
  if (!isoDate) return "—";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(parsed);
  visit.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - visit.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastVisitAgo(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatOverdueCopy(daysOverdue: number): string | null {
  if (daysOverdue <= 0) return null;
  if (daysOverdue === 1) return "Follow-up overdue by 1 day";
  return `Follow-up overdue by ${daysOverdue} days`;
}

export type MappedDoctorPatientsTabData = {
  patients: RecentPatientRow[];
  insights: PatientInsightMetrics;
  followUpPatients: FollowUpPatientRow[];
  totalCount: number;
};

export function mapDoctorPatientsDashboard(
  data: DoctorPatientsDashboardData
): MappedDoctorPatientsTabData {
  const patients: RecentPatientRow[] = data.recent_patients.results.map((row) => ({
    id: row.patient_id,
    patientName: row.patient_name,
    mobile: row.mobile ?? undefined,
    lastVisit: formatLastVisit(row.last_visit_date),
    totalVisits: row.total_visits,
    diagnosis: row.diagnosis || "No diagnosis",
    status: STATUS_MAP[row.status] ?? "Stable",
    riskLevel: row.risk_level,
    hasOpenEncounter: row.has_open_encounter,
    openEncounterState: row.open_encounter_state,
    hasUnfinishedConsultation: row.has_unfinished_consultation,
  }));

  const insights: PatientInsightMetrics = {
    patientsSeenToday: data.insights.patients_seen_today,
    followUpDue: data.insights.followup_due,
    treatmentOngoing: data.insights.treatment_ongoing,
    pendingReports: data.insights.pending_reports,
  };

  const followUpPatients: FollowUpPatientRow[] = data.followup_patients.map((row) => ({
    id: row.patient_id,
    patientName: row.patient_name,
    lastVisitAgo: formatLastVisitAgo(row.last_visit_days),
    daysOverdue: row.days_overdue,
    overdueLabel: formatOverdueCopy(row.days_overdue),
    followupDate: row.followup_date,
  }));

  return {
    patients,
    insights,
    followUpPatients,
    totalCount: data.recent_patients.count,
  };
}
