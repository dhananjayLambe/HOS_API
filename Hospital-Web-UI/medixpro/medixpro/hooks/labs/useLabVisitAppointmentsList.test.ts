import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLabVisitAppointmentsList } from "@/hooks/labs/useLabVisitAppointmentsList";

vi.mock("@/lib/labs/api/visit-appointments", () => ({
  fetchVisitAppointmentsList: vi.fn().mockResolvedValue({
    results: [],
    total: 0,
    total_pages: 0,
  }),
  fetchVisitAppointmentsSummary: vi.fn().mockResolvedValue({
    scheduled_today: 0,
    confirmed_today: 0,
    checked_in: 0,
    completed_today: 0,
    failed_no_show: 0,
  }),
}));

import { fetchVisitAppointmentsList } from "@/lib/labs/api/visit-appointments";

describe("useLabVisitAppointmentsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not set loading on refetch after initial load completes", async () => {
    const { result } = renderHook(() => useLabVisitAppointmentsList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetchVisitAppointmentsList).toHaveBeenCalledTimes(2);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.showInitialSkeleton).toBe(false);
  });
});
