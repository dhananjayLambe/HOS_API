import { describe, expect, it } from "vitest";

import { mapDoctorPracticeOverviewDashboard } from "@/lib/doctor/mapDoctorPracticeOverviewDashboard";
import type { DoctorPracticeOverviewDashboardData } from "@/lib/api/doctor-practice-overview-dashboard";

const sampleData: DoctorPracticeOverviewDashboardData = {
  generated_at: "2026-06-14T18:45:00+05:30",
  practice_metrics: {
    patients_today: 12,
    patients_this_week: 68,
    patient_visits_this_month: 284,
    followups_completed: 24,
    consultations_completed: 18,
  },
  consultation_mix: {
    new_consultations: 10,
    followup_consultations: 8,
    cancelled: 1,
    no_show: 0,
  },
  practice_summary: {
    new_patients: 15,
    returning_patients: 269,
    active_treatments: 42,
    patients_under_treatment: 42,
  },
  recent_trends: [
    { metric_key: "consultations", label: "Consultations", today: 18, week: 68 },
    { metric_key: "follow_ups", label: "Follow-Ups", today: 8, week: 24 },
    { metric_key: "new_patients", label: "New Patients", today: 5, week: 15 },
  ],
  v2_analytics: {
    daily_consultations: [],
    monthly_growth: [],
    top_diagnoses: [],
    top_prescribed_medicines: [],
  },
};

describe("mapDoctorPracticeOverviewDashboard", () => {
  it("maps generated_at and practice metrics", () => {
    const mapped = mapDoctorPracticeOverviewDashboard(sampleData);
    expect(mapped.generatedAt).toBe("2026-06-14T18:45:00+05:30");
    expect(mapped.metrics.patientsToday).toBe(12);
    expect(mapped.metrics.consultationsCompleted).toBe(18);
  });

  it("maps consultation mix and summary", () => {
    const mapped = mapDoctorPracticeOverviewDashboard(sampleData);
    expect(mapped.consultationMix.newConsultations).toBe(10);
    expect(mapped.summary.activeTreatments).toBe(42);
    expect(mapped.summary.patientsUnderTreatment).toBe(42);
  });

  it("maps recent trends with metric_key and label", () => {
    const mapped = mapDoctorPracticeOverviewDashboard(sampleData);
    expect(mapped.recentTrends).toHaveLength(3);
    expect(mapped.recentTrends[0]).toEqual({
      metricKey: "consultations",
      label: "Consultations",
      today: 18,
      week: 68,
    });
  });
});
