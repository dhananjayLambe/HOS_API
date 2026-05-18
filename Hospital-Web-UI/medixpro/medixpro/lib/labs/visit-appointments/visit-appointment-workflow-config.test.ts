import { describe, expect, it } from "vitest";
import { labelForStatus } from "@/lib/labs/constants/status";
import {
  appointmentStatusDisplayLabel,
  isAppointmentOverdue,
  resolveAllowedActions,
  workflowHintForStatus,
  nextStatusForAction,
} from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";

describe("visit-appointment-workflow-config", () => {
  it("resolveAllowedActions returns confirm for PENDING", () => {
    expect(resolveAllowedActions("PENDING")).toContain("confirm");
    expect(resolveAllowedActions("PENDING")).toContain("mark_no_show");
    expect(resolveAllowedActions("PENDING")).toContain("reschedule");
  });

  it("resolveAllowedActions for RESCHEDULED matches backend", () => {
    expect(resolveAllowedActions("RESCHEDULED")).toEqual(["confirm", "mark_no_show"]);
  });

  it("nextStatusForAction transitions correctly", () => {
    expect(nextStatusForAction("confirm", "PENDING")).toBe("CONFIRMED");
    expect(nextStatusForAction("check_in", "CONFIRMED")).toBe("CHECKED_IN");
    expect(nextStatusForAction("complete", "CHECKED_IN")).toBe("COMPLETED");
    expect(nextStatusForAction("mark_no_show", "CONFIRMED")).toBe("NO_SHOW");
    expect(nextStatusForAction("reschedule", "PENDING")).toBe("RESCHEDULED");
    expect(nextStatusForAction("reschedule", "CHECKED_IN")).toBeNull();
  });

  it("isAppointmentOverdue when date is past and not terminal", () => {
    const ref = new Date("2026-05-18T12:00:00");
    expect(isAppointmentOverdue("2026-05-17", "PENDING", ref)).toBe(true);
    expect(isAppointmentOverdue("2026-05-18", "PENDING", ref)).toBe(false);
    expect(isAppointmentOverdue("2026-05-17", "COMPLETED", ref)).toBe(false);
  });

  it("workflowHintForStatus prefixes overdue copy", () => {
    expect(workflowHintForStatus("PENDING", { overdue: true })).toMatch(/^Overdue/);
  });

  it("appointmentStatusDisplayLabel differs from LabStatusBadge default for queue copy", () => {
    expect(appointmentStatusDisplayLabel("PENDING")).toBe("Scheduled");
    expect(labelForStatus("appointment", "PENDING")).toBe("Pending");
    expect(appointmentStatusDisplayLabel("RESCHEDULED")).toBe("Rescheduled");
    expect(appointmentStatusDisplayLabel("NO_SHOW")).toBe("No show");
    expect(appointmentStatusDisplayLabel("CANCELLED")).toBe("Cancelled");
    expect(appointmentStatusDisplayLabel("CONFIRMED")).toBe("Confirmed");
    expect(appointmentStatusDisplayLabel("COMPLETED")).toBe("Completed");
  });
});
