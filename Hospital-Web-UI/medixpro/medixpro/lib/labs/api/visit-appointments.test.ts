import { describe, expect, it } from "vitest";
import {
  VISIT_APPOINTMENTS_BASE,
  buildVisitAppointmentsQueryParams,
} from "@/lib/labs/api/visit-appointments";

describe("buildVisitAppointmentsQueryParams", () => {
  it("maps list filters to backend query params", () => {
    expect(
      buildVisitAppointmentsQueryParams({
        q: "ORD-1",
        status: "scheduled",
        date_preset: "today",
        page: 2,
        page_size: 20,
        ordering: "-appointment_date",
      }),
    ).toEqual({
      q: "ORD-1",
      status: "scheduled",
      date_preset: "today",
      page: 2,
      page_size: 20,
      ordering: "-appointment_date",
    });
  });

  it("omits empty optional params", () => {
    expect(buildVisitAppointmentsQueryParams({})).toEqual({});
  });
});

describe("VISIT_APPOINTMENTS_BASE", () => {
  it("uses labs visit-appointments path prefix", () => {
    expect(VISIT_APPOINTMENTS_BASE).toBe("labs/visit-appointments");
  });
});
