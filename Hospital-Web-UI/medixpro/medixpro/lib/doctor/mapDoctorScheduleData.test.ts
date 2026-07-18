import { describe, expect, it } from "vitest";

import {
  aggregateScheduleMetrics,
  buildScheduleMetricsFromBackend,
  countInConsultation,
  mapDoctorAppointmentToRow,
  mapDoctorAppointmentsResponse,
  mapDoctorQueueToPanel,
  mergeQueueWalkInsIntoAppointments,
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
    expect(row.patientId).toBe("p1");
    expect(row.time).toBe("09:00 AM");
    expect(row.type).toBe("Follow-up");
    expect(row.status).toBe("Waiting");
  });

  it("maps walk-in booking source to Walk-in type label", () => {
    const row = mapDoctorAppointmentToRow({
      id: "w1",
      patient_name: "Rachana Lambe",
      patient_profile_id: "p2",
      appointment_date: "2026-06-14",
      slot_start_time: "10:30:00",
      status: "scheduled",
      appointment_type: "new",
      booking_source: "walk_in",
    });

    expect(row.type).toBe("Walk-in");
    expect(row.status).toBe("Scheduled");
  });

  it("aggregates schedule metrics from statuses", () => {
    const metrics = aggregateScheduleMetrics([
      { id: "1", patient_name: "A", patient_profile_id: "p1", appointment_date: "d", slot_start_time: "09:00:00", status: "scheduled" },
      { id: "2", patient_name: "B", patient_profile_id: "p2", appointment_date: "d", slot_start_time: "10:00:00", status: "completed" },
      { id: "3", patient_name: "C", patient_profile_id: "p3", appointment_date: "d", slot_start_time: "11:00:00", status: "checked_in" },
      { id: "4", patient_name: "D", patient_profile_id: "p4", appointment_date: "d", slot_start_time: "12:00:00", status: "in_consultation" },
    ]);

    expect(metrics).toEqual({
      scheduled: 1,
      completed: 1,
      waiting: 1,
      cancelled: 0,
      noShow: 0,
    });
    expect(countInConsultation([
      { id: "4", patient_name: "D", patient_profile_id: "p4", appointment_date: "d", slot_start_time: "12:00:00", status: "in_consultation" },
    ])).toBe(1);
  });

  it("counts queue-only walk-ins toward Waiting in schedule summary", () => {
    const metrics = aggregateScheduleMetrics(
      [],
      [{ id: "q1", patient_name: "Walk-in Patient", patient_profile_id: "p9", status: "waiting", position: 1 }]
    );

    expect(metrics.waiting).toBe(1);
    expect(metrics.scheduled).toBe(0);
  });

  it("merges queue-only walk-ins into appointment list", () => {
    const merged = mergeQueueWalkInsIntoAppointments(
      [],
      [{ id: "q1", patient_name: "Walk-in Patient", patient_profile_id: "p9", status: "waiting", position: 1 }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.booking_source).toBe("walk_in");
    expect(merged[0]?.patient_name).toBe("Walk-in Patient");
  });

  it("maps queue panel snapshot and tokens", () => {
    const { snapshot, tokens } = mapDoctorQueueToPanel(
      [
        { id: "q1", patient_name: "Rachana", patient_profile_id: "p1", status: "vitals_done", position: 1 },
        { id: "q2", patient_name: "Amit", patient_profile_id: "p2", status: "waiting", position: 2 },
      ],
      { completed: 3, cancelled: 1, noShow: 2 }
    );

    expect(snapshot).toEqual({ waiting: 1, completed: 3, cancelled: 1, noShow: 2 });
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.patientName).toBe("Rachana");
    expect(tokens[0]?.patientId).toBe("p1");
  });

  it("uses backend metrics for completed and cancelled counts", () => {
    const mapped = mapDoctorAppointmentsResponse(
      [
        { id: "1", patient_name: "A", patient_profile_id: "p1", appointment_date: "d", slot_start_time: "09:00:00", status: "scheduled" },
      ],
      [],
      1,
      {
        date: "2026-06-14",
        scheduled: 1,
        waiting: 0,
        completed: 4,
        cancelled: 2,
        no_show: 1,
      }
    );

    expect(mapped.metrics).toEqual({
      scheduled: 1,
      completed: 4,
      waiting: 0,
      cancelled: 2,
      noShow: 1,
    });
    expect(mapped.queueSnapshot).toEqual({
      waiting: 0,
      completed: 4,
      cancelled: 2,
      noShow: 1,
    });
  });

  it("adds queue-only walk-ins to backend waiting count", () => {
    const metrics = buildScheduleMetricsFromBackend(
      {
        date: "2026-06-14",
        scheduled: 2,
        waiting: 1,
        completed: 3,
        cancelled: 1,
        no_show: 0,
      },
      [],
      [{ id: "q1", patient_name: "Walk-in", patient_profile_id: "p9", status: "waiting", position: 1 }]
    );

    expect(metrics.waiting).toBe(2);
    expect(metrics.completed).toBe(3);
    expect(metrics.cancelled).toBe(1);
  });

  it("increments total appointments when queue-only walk-ins are merged", () => {
    const mapped = mapDoctorAppointmentsResponse(
      [],
      [{ id: "q1", patient_name: "Walk-in", patient_profile_id: "p9", status: "waiting", position: 1 }],
      0
    );

    expect(mapped.totalAppointments).toBe(1);
    expect(mapped.appointments).toHaveLength(1);
    expect(mapped.metrics.waiting).toBe(1);
  });
});
