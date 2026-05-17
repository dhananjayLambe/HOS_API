import { describe, expect, it } from "vitest";
import { mockFetchVisitAppointmentsList, mockFetchVisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments-mock";

describe("visit-appointments-mock", () => {
  it("filters by failed tab (NO_SHOW and CANCELLED)", async () => {
    const todayFailed = await mockFetchVisitAppointmentsList({
      status: "failed",
      date_preset: "today",
      page: 1,
      page_size: 50,
    });
    const weekFailed = await mockFetchVisitAppointmentsList({
      status: "failed",
      date_preset: "week",
      page: 1,
      page_size: 50,
    });
    expect(todayFailed.results.length).toBeGreaterThanOrEqual(1);
    expect(weekFailed.results.length).toBeGreaterThanOrEqual(2);
    const statuses = new Set(weekFailed.results.map((r) => r.appointment_status));
    expect(statuses.has("NO_SHOW")).toBe(true);
    expect(statuses.has("CANCELLED")).toBe(true);
  });

  it("filters scheduled tab to PENDING", async () => {
    const res = await mockFetchVisitAppointmentsList({
      status: "PENDING",
      date_preset: "week",
      page: 1,
      page_size: 50,
    });
    for (const row of res.results) {
      expect(row.appointment_status).toBe("PENDING");
    }
  });

  it("summary returns numeric counts", async () => {
    const summary = await mockFetchVisitAppointmentsSummary("today");
    expect(summary.scheduled_today).toBeGreaterThanOrEqual(0);
    expect(summary.failed_no_show).toBeGreaterThanOrEqual(0);
  });

  it("search matches patient name", async () => {
    const res = await mockFetchVisitAppointmentsList({
      q: "Rahul",
      date_preset: "week",
      page: 1,
      page_size: 50,
    });
    expect(res.results.some((r) => r.patient_name.includes("Rahul"))).toBe(true);
  });
});
