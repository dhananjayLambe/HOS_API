import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES_BY_TAB,
  appointmentMatchesTab,
  statusParamForTab,
} from "@/lib/labs/visit-appointments/build-visit-appointments-query";

describe("build-visit-appointments-query", () => {
  it("maps each tab to API status param", () => {
    expect(statusParamForTab("scheduled")).toBe("scheduled");
    expect(statusParamForTab("confirmed")).toBe("CONFIRMED");
    expect(statusParamForTab("checked_in")).toBe("CHECKED_IN");
    expect(statusParamForTab("completed")).toBe("COMPLETED");
    expect(statusParamForTab("failed")).toBe("failed");
    expect(statusParamForTab("")).toBeUndefined();
  });

  it("scheduled tab includes PENDING and RESCHEDULED", () => {
    expect(APPOINTMENT_STATUSES_BY_TAB.scheduled).toEqual(["PENDING", "RESCHEDULED"]);
    expect(appointmentMatchesTab("PENDING", "scheduled")).toBe(true);
    expect(appointmentMatchesTab("RESCHEDULED", "scheduled")).toBe(true);
    expect(appointmentMatchesTab("CONFIRMED", "scheduled")).toBe(false);
  });

  it("failed tab includes NO_SHOW and CANCELLED", () => {
    expect(appointmentMatchesTab("NO_SHOW", "failed")).toBe(true);
    expect(appointmentMatchesTab("CANCELLED", "failed")).toBe(true);
    expect(appointmentMatchesTab("COMPLETED", "failed")).toBe(false);
  });

  it("appointmentMatchesTab returns true when tab is empty", () => {
    expect(appointmentMatchesTab("CONFIRMED", "")).toBe(true);
  });

  it("maps confirmed, checked_in, and completed tabs", () => {
    expect(appointmentMatchesTab("CONFIRMED", "confirmed")).toBe(true);
    expect(appointmentMatchesTab("PENDING", "confirmed")).toBe(false);
    expect(appointmentMatchesTab("CHECKED_IN", "checked_in")).toBe(true);
    expect(appointmentMatchesTab("COMPLETED", "completed")).toBe(true);
  });
});
