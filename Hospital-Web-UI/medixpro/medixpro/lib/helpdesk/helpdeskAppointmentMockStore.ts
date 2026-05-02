/**
 * Central mock catalog + generators. Imported by hooks only — not by presentational components.
 */
import { addDays, format } from "date-fns";

import type { Appointment, MockDoctor, Slot, SlotState } from "./helpdeskAppointmentTypes";

export const MOCK_DOCTORS: MockDoctor[] = [
  { id: "doc-1", name: "Dr. Ananya Sharma", specialization: "General Medicine" },
  { id: "doc-2", name: "Dr. Rohan Mehta", specialization: "Cardiology" },
  { id: "doc-3", name: "Dr. Priya Nair", specialization: "Dermatology" },
];

/** Triggers mock "doctor unavailable" error in fetchSlots. */
export const MOCK_DOCTOR_UNAVAILABLE_ID = "doc-unavailable-mock";

/** Appended to MOCK_DOCTORS only for error demos — do not show in normal selector or filter separately if undesired; we add to list in hook for fetchSlots error path only. */
export const MOCK_DOCTOR_UNAVAILABLE: MockDoctor = {
  id: MOCK_DOCTOR_UNAVAILABLE_ID,
  name: "Dr. Unavailable (demo)",
  specialization: "Demo",
};

let appointmentSeq = 0;

export function nextAppointmentId(): string {
  appointmentSeq += 1;
  return `mock-appt-${Date.now()}-${appointmentSeq}`;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic pseudo-random 0..1 from doctorId + date. */
function prng(doctorId: string, date: string, salt: number): number {
  const x = Math.sin(hashSeed(`${doctorId}|${date}|${salt}`)) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate 15-minute slots 06:00–21:45 with mixed states (deterministic per doctor+date).
 * Covers morning / afternoon / evening buckets for the slot grid.
 */
export function generateMockSlots(doctorId: string, date: string): Slot[] {
  const slots: Slot[] = [];
  let minutes = 6 * 60;
  const lastStart = 21 * 60 + 45;

  let i = 0;
  while (minutes <= lastStart) {
    const startH = Math.floor(minutes / 60);
    const startM = minutes % 60;
    const endMin = minutes + 15;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    const startTime = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const r = prng(doctorId, date, i);
    let state: SlotState;
    if (r < 0.45) state = "available";
    else if (r < 0.75) state = "booked";
    else state = "blocked";

    slots.push({
      id: `slot-${doctorId}-${date}-${startTime}`,
      startTime,
      endTime,
      state,
    });
    minutes += 15;
    i += 1;
  }
  return slots;
}


export function buildSeedAppointments(): Appointment[] {
  const today = format(new Date(), "yyyy-MM-dd");
  const t1 = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const t3 = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const past = format(addDays(new Date(), -2), "yyyy-MM-dd");

  return [
    {
      id: "seed-1",
      patientProfileId: "seed-p-1",
      patientName: "Ravi Kumar",
      doctorId: MOCK_DOCTORS[0].id,
      doctorName: MOCK_DOCTORS[0].name,
      appointmentDate: today,
      appointmentTime: "10:00",
      consultationMode: "clinic",
      appointmentType: "follow_up",
      consultationFee: 500,
      notes: "",
      status: "scheduled",
    },
    {
      id: "seed-2",
      patientProfileId: "seed-p-2",
      patientName: "Sneha Patil",
      doctorId: MOCK_DOCTORS[1].id,
      doctorName: MOCK_DOCTORS[1].name,
      appointmentDate: today,
      appointmentTime: "11:30",
      consultationMode: "video",
      appointmentType: "new",
      consultationFee: 800,
      notes: "First visit",
      status: "checked_in",
    },
    {
      id: "seed-3",
      patientProfileId: "seed-p-3",
      patientName: "Amit Shah",
      doctorId: MOCK_DOCTORS[0].id,
      doctorName: MOCK_DOCTORS[0].name,
      appointmentDate: t1,
      appointmentTime: "09:15",
      consultationMode: "clinic",
      appointmentType: "new",
      consultationFee: 600,
      notes: "",
      status: "scheduled",
    },
    {
      id: "seed-4",
      patientProfileId: "seed-p-4",
      patientName: "Neha Gupta",
      doctorId: MOCK_DOCTORS[2].id,
      doctorName: MOCK_DOCTORS[2].name,
      appointmentDate: t3,
      appointmentTime: "16:00",
      consultationMode: "clinic",
      appointmentType: "follow_up",
      consultationFee: 450,
      notes: "",
      status: "scheduled",
    },
    {
      id: "seed-5",
      patientProfileId: "seed-p-5",
      patientName: "Vikram Singh",
      doctorId: MOCK_DOCTORS[1].id,
      doctorName: MOCK_DOCTORS[1].name,
      appointmentDate: past,
      appointmentTime: "10:30",
      consultationMode: "clinic",
      appointmentType: "follow_up",
      consultationFee: 700,
      notes: "",
      status: "completed",
    },
    {
      id: "seed-6",
      patientProfileId: "seed-p-6",
      patientName: "Kavita Rao",
      doctorId: MOCK_DOCTORS[0].id,
      doctorName: MOCK_DOCTORS[0].name,
      appointmentDate: today,
      appointmentTime: "14:00",
      consultationMode: "video",
      appointmentType: "new",
      consultationFee: 550,
      notes: "",
      status: "cancelled",
    },
  ];
}

export async function mockDelay(msMin = 500, msMax = 1000): Promise<void> {
  const ms = msMin + Math.floor(Math.random() * (msMax - msMin + 1));
  await new Promise((r) => setTimeout(r, ms));
}
