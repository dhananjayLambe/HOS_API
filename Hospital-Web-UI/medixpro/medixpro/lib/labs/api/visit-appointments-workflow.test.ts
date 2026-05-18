import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendAxiosClient } from "@/lib/axiosClient";
import {
  VISIT_APPOINTMENTS_BASE,
  checkInVisitAppointment,
  completeVisitAppointment,
  confirmVisitAppointment,
  markNoShowVisitAppointment,
  parseVisitWorkflowActionError,
  rescheduleVisitAppointment,
} from "@/lib/labs/api/visit-appointments";
import type { VisitAppointmentWorkflowResponse } from "@/lib/labs/api/visit-appointments-types";

vi.mock("@/lib/axiosClient", () => ({
  backendAxiosClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const visitId = "00000000-0000-0000-0000-000000000099";

function workflowResponse(
  overrides: Partial<VisitAppointmentWorkflowResponse> = {},
): VisitAppointmentWorkflowResponse {
  return {
    success: true,
    appointment_status: "CONFIRMED",
    message: "Patient appointment confirmed.",
    appointment_id: visitId,
    allowed_actions: ["check_in", "mark_no_show", "reschedule"],
    workflow_hint: "Patient appointment confirmed",
    status_updated_at: "2026-05-18T10:00:00.000Z",
    confirmed_at: "2026-05-18T10:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    no_show_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

describe("visit workflow API integration", () => {
  beforeEach(() => {
    vi.mocked(backendAxiosClient.post).mockReset();
  });

  it.each([
    ["confirm", confirmVisitAppointment, `${VISIT_APPOINTMENTS_BASE}/${visitId}/confirm/`],
    ["check-in", checkInVisitAppointment, `${VISIT_APPOINTMENTS_BASE}/${visitId}/check-in/`],
    ["complete", completeVisitAppointment, `${VISIT_APPOINTMENTS_BASE}/${visitId}/complete/`],
    ["no-show", markNoShowVisitAppointment, `${VISIT_APPOINTMENTS_BASE}/${visitId}/no-show/`],
    ["reschedule", rescheduleVisitAppointment, `${VISIT_APPOINTMENTS_BASE}/${visitId}/reschedule/`],
  ] as const)("posts to %s endpoint", async (_label, fn, url) => {
    vi.mocked(backendAxiosClient.post).mockResolvedValue({
      data: workflowResponse(),
    });
    await fn(visitId);
    expect(backendAxiosClient.post).toHaveBeenCalled();
    expect(backendAxiosClient.post.mock.calls[0]?.[0]).toBe(url);
  });

  it("sends no-show reason in request body", async () => {
    vi.mocked(backendAxiosClient.post).mockResolvedValue({
      data: workflowResponse({ appointment_status: "NO_SHOW", allowed_actions: [] }),
    });
    await markNoShowVisitAppointment(visitId, "Patient absent");
    expect(backendAxiosClient.post).toHaveBeenCalledWith(
      `${VISIT_APPOINTMENTS_BASE}/${visitId}/no-show/`,
      { reason: "Patient absent" },
    );
  });

  it("sends reschedule payload when provided", async () => {
    vi.mocked(backendAxiosClient.post).mockResolvedValue({
      data: workflowResponse({ appointment_status: "RESCHEDULED" }),
    });
    await rescheduleVisitAppointment(visitId, {
      appointment_date: "2026-06-01",
      appointment_slot: " 9-11 AM ",
    });
    expect(backendAxiosClient.post).toHaveBeenCalledWith(
      `${VISIT_APPOINTMENTS_BASE}/${visitId}/reschedule/`,
      { appointment_date: "2026-06-01", appointment_slot: "9-11 AM" },
    );
  });

  it("normalizes missing status_updated_at from audit timestamps", async () => {
    vi.mocked(backendAxiosClient.post).mockResolvedValue({
      data: {
        ...workflowResponse({ status_updated_at: undefined }),
        checked_in_at: "2026-05-18T11:00:00.000Z",
      },
    });
    const res = await checkInVisitAppointment(visitId);
    expect(res.status_updated_at).toBe("2026-05-18T11:00:00.000Z");
  });
});

describe("parseVisitWorkflowActionError", () => {
  it("prefers API detail from 409 conflict", () => {
    expect(
      parseVisitWorkflowActionError({
        response: { data: { detail: "Cannot transition from PENDING to COMPLETED." } },
        message: "Request failed with status code 409",
      }),
    ).toBe("Cannot transition from PENDING to COMPLETED.");
  });

  it("falls back to axios message", () => {
    expect(parseVisitWorkflowActionError({ message: "Network Error" })).toBe("Network Error");
  });

  it("uses default copy for unknown errors", () => {
    expect(parseVisitWorkflowActionError({})).toBe("Action failed.");
  });
});
