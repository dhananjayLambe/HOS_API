import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/doctor/resolveDoctorContext", () => ({
  resolveDoctorContext: vi.fn().mockResolvedValue({
    isReady: true,
    doctorId: "doctor-1",
    clinicId: "clinic-1",
  }),
}));

vi.mock("@/lib/api/doctor-practice-overview-dashboard", () => ({
  fetchDoctorPracticeOverviewDashboard: vi.fn(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    sessionChecked: true,
    isAuthenticated: true,
  }),
}));

import { fetchDoctorPracticeOverviewDashboard } from "@/lib/api/doctor-practice-overview-dashboard";
import { useDoctorPracticeOverviewTab } from "@/hooks/useDoctorPracticeOverviewTab";

const dashboardPayload = {
  generated_at: "2026-06-14T12:00:00+00:00",
  practice_metrics: {
    patients_today: 1,
    patients_this_week: 2,
    patient_visits_this_month: 3,
    followups_completed: 4,
    consultations_completed: 5,
  },
  consultation_mix: {
    new_consultations: 1,
    followup_consultations: 2,
    cancelled: 0,
    no_show: 0,
  },
  practice_summary: {
    new_patients: 1,
    returning_patients: 2,
    active_treatments: 3,
    patients_under_treatment: 3,
  },
  recent_trends: [
    { metric_key: "consultations", label: "Consultations", today: 1, week: 2 },
  ],
  v2_analytics: {
    daily_consultations: [],
    monthly_growth: [],
    top_diagnoses: [],
    top_prescribed_medicines: [],
  },
};

describe("useDoctorPracticeOverviewTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDoctorPracticeOverviewDashboard).mockResolvedValue(dashboardPayload);
  });

  it("fetches when enabled", async () => {
    const { result } = renderHook(() => useDoctorPracticeOverviewTab({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchDoctorPracticeOverviewDashboard).toHaveBeenCalled();
    expect(result.current.metrics.patientsToday).toBe(1);
    expect(result.current.recentTrends[0].metricKey).toBe("consultations");
  });

  it("does not fetch when disabled", async () => {
    renderHook(() => useDoctorPracticeOverviewTab({ enabled: false }));

    await waitFor(() => {
      expect(fetchDoctorPracticeOverviewDashboard).not.toHaveBeenCalled();
    });
  });

  it("preserves last-good data when a background refetch fails", async () => {
    const { result } = renderHook(() => useDoctorPracticeOverviewTab({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics.patientsToday).toBe(1);
    expect(result.current.error).toBeNull();

    vi.mocked(fetchDoctorPracticeOverviewDashboard).mockRejectedValueOnce(new Error("Network error"));

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.metrics.patientsToday).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });

  it("sets error when the initial fetch fails", async () => {
    vi.mocked(fetchDoctorPracticeOverviewDashboard).mockRejectedValueOnce(new Error("Initial failure"));

    const { result } = renderHook(() => useDoctorPracticeOverviewTab({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Initial failure");
    });
  });
});
