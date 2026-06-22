import type { ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import type { PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import type { PracticeSummary } from "@/components/doctor/doctor-practice-summary";
import type { RecentTrendRow } from "@/components/doctor/doctor-recent-trends";
import type { DoctorPracticeOverviewDashboardData } from "@/lib/api/doctor-practice-overview-dashboard";

export type MappedDoctorPracticeOverviewTabData = {
  generatedAt: string;
  metrics: PracticeMetrics;
  consultationMix: ConsultationMix;
  summary: PracticeSummary;
  recentTrends: RecentTrendRow[];
};

export function mapDoctorPracticeOverviewDashboard(
  data: DoctorPracticeOverviewDashboardData,
): MappedDoctorPracticeOverviewTabData {
  return {
    generatedAt: data.generated_at,
    metrics: {
      patientsToday: data.practice_metrics.patients_today,
      patientsThisWeek: data.practice_metrics.patients_this_week,
      patientVisitsThisMonth: data.practice_metrics.patient_visits_this_month,
      followUpsCompleted: data.practice_metrics.followups_completed,
      consultationsCompleted: data.practice_metrics.consultations_completed,
    },
    consultationMix: {
      newConsultations: data.consultation_mix.new_consultations,
      followUpConsultations: data.consultation_mix.followup_consultations,
      cancelled: data.consultation_mix.cancelled,
      noShow: data.consultation_mix.no_show,
    },
    summary: {
      newPatients: data.practice_summary.new_patients,
      returningPatients: data.practice_summary.returning_patients,
      activeTreatments: data.practice_summary.active_treatments,
      patientsUnderTreatment: data.practice_summary.patients_under_treatment,
    },
    recentTrends: data.recent_trends.map((row) => ({
      metricKey: row.metric_key,
      label: row.label,
      today: row.today,
      week: row.week,
    })),
  };
}
