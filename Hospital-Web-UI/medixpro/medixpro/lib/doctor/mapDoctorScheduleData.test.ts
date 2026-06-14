import { describe, expect, it } from "vitest";

import {
  aggregateScheduleMetrics,
  countInConsultation,
  mapDoctorAppointmentToRow,
  mapDoctorQueueToPanel,
} from "./mapDoctorScheduleData";

describe("mapDoctorScheduleData", () => {
  it("maps appointment row fields and labels", () => {
    const row = mapDoctorAppointmentToRow({
      id: "a1",
      patient_name: "Amit Patil",
      patient_profile_id: "p1",
      appointment_date: "2026-06-13",
      slot_start_time: "09:00:00",
      status: "checked_in",
      appointment_type: "follow_up",
    });

    expect(row.patientName).toBe("Amit Patil");
    expect(row.time).toBe("09:00 AM");
    expect(row.type).toBe("Follow-up");
    expect(row.status).toBe("Waiting");
  });

  it("aggregates schedule metrics from statuses", () => {
    const metrics = aggregateScheduleMetrics([
      { id: "1", patient_name: "A", patient_profile_id: "p", appointment_date: "d", slot_start_time: "09:00:00", status: "scheduled" },
      { id: "2", patient_name: "B", patient_profile_id: "p", appointment_date: "d", slot_start_time: "10:00:00", status: "completed" },
      { id: "3", patient_name: "C", patient_profile_id: "p", appointment_date: "d", slot_start_time: "11:00:00", status: "checked_in" },
      { id: "4", patient_name: "D", patient_profile_id: "p", appointment_date: "d", slot_start_time: "12:00:00", status: "in_consultation" },
    ]);

    expect(metrics).toEqual({
      scheduled: 1,
      completed: 1,
      waiting: 1,
      cancelled: 0,
      noShow: 0,
    });
    expect(countInConsultation([
      { id: "4", patient_name: "D", patient_profile_id: "p", appointment_date: "d", slot_start_time: "12:00:00", status: "in_consultation" },
    ])).toBe(1);
  });

  it("maps queue panel snapshot and tokens", () => {
    const { snapshot, tokens } = mapDoctorQueueToPanel(
      [
        { id: "q1", patient_name: "Rachana", status: "vitals_done", position: 1 },
        { id: "q2", patient_name: "Amit", status: "waiting", position: 2 },
      ],
      [
        { id: "a1", patient_name: "Priya", patient_profile_id: "p", appointment_date: "d", slot_start_time: "10:00:00", status: "in_consultation" },
      ]
    );

    expect(snapshot).toEqual({ waiting: 1, vitalsDone: 1, inConsultation: 1 });
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.patientName).toBe("Rachana");
  });
});
