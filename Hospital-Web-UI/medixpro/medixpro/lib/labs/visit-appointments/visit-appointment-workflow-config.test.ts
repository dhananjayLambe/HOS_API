import { describe, expect, it } from "vitest";
import {
  isAppointmentOverdue,
  resolveAllowedActions,
  workflowHintForStatus,
  nextStatusForAction,
} from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";

describe("visit-appointment-workflow-config", () => {
  it("resolveAllowedActions returns confirm for PENDING", () => {
    expect(resolveAllowedActions("PENDING")).toContain("confirm");
    expect(resolveAllowedActions("PENDING")).toContain("mark_no_show");
  });

  it("nextStatusForAction transitions correctly", () => {
    expect(nextStatusForAction("confirm", "PENDING")).toBe("CONFIRMED");
    expect(nextStatusForAction("check_in", "CONFIRMED")).toBe("CHECKED_IN");
    expect(nextStatusForAction("complete", "CHECKED_IN")).toBe("COMPLETED");
    expect(nextStatusForAction("mark_no_show", "CONFIRMED")).toBe("NO_SHOW");
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
});
