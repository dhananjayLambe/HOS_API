import type { ReportActivityItem } from "@/components/doctor/doctor-recent-report-activity";
import type { ReportInsightMetrics } from "@/components/doctor/doctor-report-insights";
import type { DoctorReportRow, ReportRowStatus } from "@/components/doctor/doctor-reports-table";
import type {
  DoctorReportsDashboardActivity,
  DoctorReportsDashboardData,
} from "@/lib/api/doctor-reports-dashboard";

const STATUS_MAP: Record<string, ReportRowStatus> = {
  READY_FOR_REVIEW: "Ready For Review",
  PENDING_UPLOAD: "Pending Upload",
};

function formatUploadedAt(isoDate: string | null): string {
  if (!isoDate) return "—";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "—";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const uploaded = new Date(parsed);
  uploaded.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatActivityTimestamp(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityDescription(event: DoctorReportsDashboardActivity): string {
  switch (event.event_type) {
    case "REPORT_UPLOADED":
      return `${event.report_name} uploaded`;
    case "REPORT_REVIEWED":
      return `${event.report_name} reviewed`;
    case "REPORT_PENDING_UPLOAD":
      return `${event.report_name} completed — report pending`;
    default:
      return event.report_name;
  }
}

export type MappedDoctorReportsTabData = {
  reports: DoctorReportRow[];
  insights: ReportInsightMetrics;
  activity: ReportActivityItem[];
  totalCount: number;
};

export function mapDoctorReportsDashboard(
  data: DoctorReportsDashboardData
): MappedDoctorReportsTabData {
  const reports: DoctorReportRow[] = data.reports.results.map((row, index) => ({
    id: row.report_id ?? `pending-${row.patient_id}-${index}`,
    reportId: row.report_id ?? undefined,
    patientId: row.patient_id,
    encounterId: row.encounter_id ?? undefined,
    visitDate: row.visit_date ?? undefined,
    patientName: row.patient_name,
    reportType: row.report_type,
    uploaded: formatUploadedAt(row.uploaded_at),
    uploadedAt: row.uploaded_at ?? undefined,
    reviewStatus: STATUS_MAP[row.review_status] ?? "Pending Upload",
    priority: row.priority,
    isCritical: row.is_critical,
    doctorAcknowledged: row.doctor_acknowledged,
    whatsappSent: row.whatsapp_sent,
  }));

  const activity: ReportActivityItem[] = data.recent_activity.map((event, index) => ({
    id: `${event.event_type}-${event.timestamp}-${index}`,
    description: formatActivityDescription(event),
    patientName: event.patient_name,
    timestamp: formatActivityTimestamp(event.timestamp),
  }));

  return {
    reports,
    insights: {
      readyForReview: data.insights.ready_for_review,
      reviewedToday: data.insights.reviewed_today,
      pendingUpload: data.insights.pending_upload,
      reportsReceivedToday: data.insights.reports_received_today,
    },
    activity,
    totalCount: data.reports.count,
  };
}
