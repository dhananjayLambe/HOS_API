import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/lib/doctor/resolveDoctorContext", () => ({
  resolveDoctorContext: vi.fn().mockResolvedValue({
    isReady: true,
    doctorId: "doctor-1",
    clinicId: "clinic-1",
  }),
}));

vi.mock("@/lib/api/doctor-reports-dashboard", () => ({
  DOCTOR_REPORTS_PAGE_SIZE_OPTIONS: [5, 10, 25, 50],
  fetchDoctorReportsDashboard: vi.fn(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    sessionChecked: true,
    isAuthenticated: true,
  }),
}));

import { fetchDoctorReportsDashboard } from "@/lib/api/doctor-reports-dashboard";
import { useDoctorReportsTab } from "@/hooks/useDoctorReportsTab";

const dashboardPayload = {
  insights: {
    ready_for_review: 1,
    reviewed_today: 0,
    pending_upload: 0,
    reports_received_today: 1,
  },
  reports: {
    count: 1,
    results: [
      {
        report_id: "r1",
        patient_id: "p1",
        patient_name: "Amit Patil",
        encounter_id: "e1",
        visit_date: "2026-06-13",
        report_type: "CBC",
        uploaded_at: new Date().toISOString(),
        review_status: "READY_FOR_REVIEW" as const,
        priority: "NORMAL" as const,
        is_critical: false,
        doctor_acknowledged: false,
        whatsapp_sent: false,
      },
    ],
  },
  recent_activity: [],
};

describe("useDoctorReportsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDoctorReportsDashboard).mockResolvedValue(dashboardPayload);
  });

  it("sets loading only on first fetch, not on refetch", async () => {
    const { result } = renderHook(() => useDoctorReportsTab({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchDoctorReportsDashboard).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("sets isRefreshing when page changes after initial load", async () => {
    const { result } = renderHook(() => useDoctorReportsTab({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(fetchDoctorReportsDashboard).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it("does not fetch when disabled", async () => {
    renderHook(() => useDoctorReportsTab({ enabled: false }));

    await waitFor(() => {
      expect(fetchDoctorReportsDashboard).not.toHaveBeenCalled();
    });
  });
});
