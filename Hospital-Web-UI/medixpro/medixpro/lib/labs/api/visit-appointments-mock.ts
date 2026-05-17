import type {
  VisitAppointmentListItem,
  VisitAppointmentWorkflowResponse,
  VisitAppointmentsListResponse,
  VisitAppointmentsSummary,
} from "@/lib/labs/api/visit-appointments-types";
import type { AppointmentStatus } from "@/lib/labs/constants/status";
import type { VisitAppointmentsQueryInput } from "@/lib/labs/api/visit-appointments";
import {
  nextStatusForAction,
  resolveAllowedActions,
  workflowHintForStatus,
  isAppointmentOverdue,
} from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";
import type { VisitAppointmentActionKey } from "@/lib/labs/api/visit-appointments-types";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatSlotDateLabel(dateStr: string): string {
  const today = isoDate(new Date());
  const tomorrow = isoDate(addDays(new Date(), 1));
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildItem(
  partial: Omit<VisitAppointmentListItem, "workflow_hint" | "allowed_actions"> & {
    workflow_hint?: string;
    allowed_actions?: VisitAppointmentActionKey[];
  },
): VisitAppointmentListItem {
  const status = partial.appointment_status;
  const overdue = isAppointmentOverdue(partial.appointment_date, status);
  return {
    ...partial,
    workflow_hint:
      partial.workflow_hint ?? workflowHintForStatus(status, { overdue }),
    allowed_actions: partial.allowed_actions ?? resolveAllowedActions(status),
  };
}

const today = new Date();
const todayStr = isoDate(today);
const yesterdayStr = isoDate(addDays(today, -1));
const tomorrowStr = isoDate(addDays(today, 1));
const weekStr = isoDate(addDays(today, 3));

let store: VisitAppointmentListItem[] = [
  buildItem({
    id: "va-001",
    appointment_id: "APT-001",
    order_number: "DX-V-2401",
    order_uuid: "ou-001",
    patient_name: "Rahul K",
    patient_phone: "+91 91234 56789",
    patient_age: 34,
    patient_gender: "M",
    test_count: 1,
    test_names: ["MRI Lumbar"],
    test_names_overflow: 0,
    appointment_date: todayStr,
    appointment_slot: "09:00",
    slot_date_label: formatSlotDateLabel(todayStr),
    slot_time_label: "09:00",
    fasting_required: false,
    prep_tags: ["Remove metallic objects"],
    instructions: "Remove metallic objects; arrive 15 min early",
    appointment_status: "CONFIRMED",
    patient_notes: null,
    status_updated_at: "2026-05-17T06:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-002",
    appointment_id: "APT-002",
    order_number: "DX-V-2402",
    order_uuid: "ou-002",
    patient_name: "Neha S",
    patient_phone: "+91 98765 11111",
    patient_age: 28,
    patient_gender: "F",
    test_count: 1,
    test_names: ["USG Abdomen"],
    test_names_overflow: 0,
    appointment_date: todayStr,
    appointment_slot: "11:30",
    slot_date_label: formatSlotDateLabel(todayStr),
    slot_time_label: "11:30",
    fasting_required: true,
    prep_tags: ["Fasting"],
    instructions: "6h fasting required",
    appointment_status: "CHECKED_IN",
    patient_notes: null,
    status_updated_at: "2026-05-18T04:30:00.000Z",
    checked_in_at: "2026-05-18T04:30:00.000Z",
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-003",
    appointment_id: "APT-003",
    order_number: "DX-V-2403",
    order_uuid: "ou-003",
    patient_name: "Anita Deshmukh",
    patient_phone: "+91 98765 43210",
    patient_age: 45,
    patient_gender: "F",
    test_count: 2,
    test_names: ["CBC", "HbA1c"],
    test_names_overflow: 0,
    appointment_date: todayStr,
    appointment_slot: "14:00",
    slot_date_label: formatSlotDateLabel(todayStr),
    slot_time_label: "14:00",
    fasting_required: true,
    prep_tags: ["Fasting"],
    instructions: "Water only after midnight",
    appointment_status: "PENDING",
    patient_notes: "Prefers morning if rescheduled",
    status_updated_at: "2026-05-17T10:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-004",
    appointment_id: "APT-004",
    order_number: "DX-V-2404",
    order_uuid: "ou-004",
    patient_name: "Vikram Patel",
    patient_phone: "+91 90000 22222",
    patient_age: 52,
    patient_gender: "M",
    test_count: 1,
    test_names: ["CT Chest"],
    test_names_overflow: 0,
    appointment_date: tomorrowStr,
    appointment_slot: "10:00",
    slot_date_label: formatSlotDateLabel(tomorrowStr),
    slot_time_label: "10:00",
    fasting_required: false,
    prep_tags: ["Contrast"],
    instructions: "Drink water before scan",
    appointment_status: "PENDING",
    patient_notes: null,
    status_updated_at: "2026-05-16T12:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-005",
    appointment_id: "APT-005",
    order_number: "DX-V-2405",
    order_uuid: "ou-005",
    patient_name: "Priya N",
    patient_phone: "+91 91111 33333",
    patient_age: 31,
    patient_gender: "F",
    test_count: 1,
    test_names: ["X-Ray Chest"],
    test_names_overflow: 0,
    appointment_date: todayStr,
    appointment_slot: "16:00",
    slot_date_label: formatSlotDateLabel(todayStr),
    slot_time_label: "16:00",
    fasting_required: false,
    prep_tags: [],
    instructions: "",
    appointment_status: "COMPLETED",
    patient_notes: null,
    status_updated_at: "2026-05-18T11:00:00.000Z",
    checked_in_at: "2026-05-18T09:00:00.000Z",
    completed_at: "2026-05-18T11:00:00.000Z",
    cancelled_at: null,
  }),
  buildItem({
    id: "va-006",
    appointment_id: "APT-006",
    order_number: "DX-V-2406",
    order_uuid: "ou-006",
    patient_name: "Suresh Iyer",
    patient_phone: "+91 92222 44444",
    patient_age: 60,
    patient_gender: "M",
    test_count: 1,
    test_names: ["ECG"],
    test_names_overflow: 0,
    appointment_date: yesterdayStr,
    appointment_slot: "08:30",
    slot_date_label: formatSlotDateLabel(yesterdayStr),
    slot_time_label: "08:30",
    fasting_required: false,
    prep_tags: [],
    instructions: "Wear loose clothing",
    appointment_status: "PENDING",
    patient_notes: null,
    status_updated_at: "2026-05-15T08:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-007",
    appointment_id: "APT-007",
    order_number: "DX-V-2407",
    order_uuid: "ou-007",
    patient_name: "Meera Joshi",
    patient_phone: "+91 93333 55555",
    patient_age: 39,
    patient_gender: "F",
    test_count: 1,
    test_names: ["MRI Brain"],
    test_names_overflow: 0,
    appointment_date: yesterdayStr,
    appointment_slot: "15:00",
    slot_date_label: formatSlotDateLabel(yesterdayStr),
    slot_time_label: "15:00",
    fasting_required: false,
    prep_tags: ["MRI metals"],
    instructions: "Remove all metallic objects",
    appointment_status: "CONFIRMED",
    patient_notes: null,
    status_updated_at: "2026-05-16T14:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-008",
    appointment_id: "APT-008",
    order_number: "DX-V-2408",
    order_uuid: "ou-008",
    patient_name: "Arjun Mehta",
    patient_phone: "+91 94444 66666",
    patient_age: 25,
    patient_gender: "M",
    test_count: 1,
    test_names: ["Ultrasound"],
    test_names_overflow: 0,
    appointment_date: weekStr,
    appointment_slot: "12:00",
    slot_date_label: formatSlotDateLabel(weekStr),
    slot_time_label: "12:00",
    fasting_required: true,
    prep_tags: ["Fasting"],
    instructions: "6h fasting",
    appointment_status: "CONFIRMED",
    patient_notes: null,
    status_updated_at: "2026-05-17T09:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-009",
    appointment_id: "APT-009",
    order_number: "DX-V-2409",
    order_uuid: "ou-009",
    patient_name: "Kavita Rao",
    patient_phone: "+91 95555 77777",
    patient_age: 42,
    patient_gender: "F",
    test_count: 3,
    test_names: ["CBC", "Lipid panel", "TSH"],
    test_names_overflow: 1,
    appointment_date: todayStr,
    appointment_slot: "07:30",
    slot_date_label: formatSlotDateLabel(todayStr),
    slot_time_label: "07:30",
    fasting_required: true,
    prep_tags: ["Fasting"],
    instructions: "12h fasting for lipid panel",
    appointment_status: "NO_SHOW",
    patient_notes: null,
    status_updated_at: "2026-05-18T08:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-010",
    appointment_id: "APT-010",
    order_number: "DX-V-2410",
    order_uuid: "ou-010",
    patient_name: "Deepak Singh",
    patient_phone: "+91 96666 88888",
    patient_age: 55,
    patient_gender: "M",
    test_count: 1,
    test_names: ["PET Scan"],
    test_names_overflow: 0,
    appointment_date: yesterdayStr,
    appointment_slot: "13:00",
    slot_date_label: formatSlotDateLabel(yesterdayStr),
    slot_time_label: "13:00",
    fasting_required: false,
    prep_tags: ["Contrast"],
    instructions: "Patient cancelled via phone",
    appointment_status: "CANCELLED",
    patient_notes: "Requested reschedule next month",
    status_updated_at: "2026-05-17T16:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: "2026-05-17T16:00:00.000Z",
  }),
  buildItem({
    id: "va-011",
    appointment_id: "APT-011",
    order_number: "DX-V-2411",
    order_uuid: "ou-011",
    patient_name: "Lakshmi Venkat",
    patient_phone: "+91 97777 99999",
    patient_age: 48,
    patient_gender: "F",
    test_count: 1,
    test_names: ["Mammography"],
    test_names_overflow: 0,
    appointment_date: tomorrowStr,
    appointment_slot: "09:30",
    slot_date_label: formatSlotDateLabel(tomorrowStr),
    slot_time_label: "09:30",
    fasting_required: false,
    prep_tags: [],
    instructions: "No deodorant on day of scan",
    appointment_status: "CONFIRMED",
    patient_notes: null,
    status_updated_at: "2026-05-18T07:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
  buildItem({
    id: "va-012",
    appointment_id: "APT-012",
    order_number: "DX-V-2412",
    order_uuid: "ou-012",
    patient_name: "Rohan Gupta",
    patient_phone: "+91 98888 00000",
    patient_age: 22,
    patient_gender: "M",
    test_count: 2,
    test_names: ["CBC", "Blood sugar"],
    test_names_overflow: 0,
    appointment_date: weekStr,
    appointment_slot: "08:00",
    slot_date_label: formatSlotDateLabel(weekStr),
    slot_time_label: "08:00",
    fasting_required: true,
    prep_tags: ["Fasting"],
    instructions: "8h fasting",
    appointment_status: "PENDING",
    patient_notes: null,
    status_updated_at: "2026-05-18T05:00:00.000Z",
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
  }),
];

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

function matchesDatePreset(dateStr: string, preset: string): boolean {
  if (!preset) return true;
  const appt = parseDate(dateStr);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (preset === "today") {
    return isoDate(appt) === isoDate(start);
  }
  if (preset === "tomorrow") {
    const t = addDays(start, 1);
    return isoDate(appt) === isoDate(t);
  }
  if (preset === "week") {
    const weekStart = addDays(start, -6);
    const weekEnd = addDays(start, 6);
    return appt >= weekStart && appt <= weekEnd;
  }
  return true;
}

function matchesStatus(item: VisitAppointmentListItem, status?: string): boolean {
  if (!status) return true;
  if (status === "failed") {
    return item.appointment_status === "NO_SHOW" || item.appointment_status === "CANCELLED";
  }
  return item.appointment_status === status;
}

function matchesSearch(item: VisitAppointmentListItem, q?: string): boolean {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [
    item.patient_name,
    item.patient_phone,
    item.appointment_id,
    item.order_number,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function delay(ms = 120): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockFetchVisitAppointmentsList(
  input: VisitAppointmentsQueryInput,
): Promise<VisitAppointmentsListResponse> {
  await delay();
  const page = input.page ?? 1;
  const pageSize = input.page_size ?? 20;
  let filtered = store.filter(
    (item) =>
      matchesStatus(item, input.status) &&
      matchesDatePreset(item.appointment_date, input.date_preset ?? "") &&
      matchesSearch(item, input.q),
  );
  filtered = filtered.map((item) =>
    buildItem({
      ...item,
      workflow_hint: workflowHintForStatus(item.appointment_status, {
        overdue: isAppointmentOverdue(item.appointment_date, item.appointment_status),
      }),
      allowed_actions: resolveAllowedActions(item.appointment_status),
    }),
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const results = filtered.slice(start, start + pageSize);
  return {
    results,
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  };
}

export async function mockFetchVisitAppointmentsSummary(
  datePreset: string,
): Promise<VisitAppointmentsSummary> {
  await delay(80);
  const inRange = store.filter((item) => matchesDatePreset(item.appointment_date, datePreset || "today"));
  return {
    scheduled_today: inRange.filter((i) => i.appointment_status === "PENDING").length,
    confirmed_today: inRange.filter((i) => i.appointment_status === "CONFIRMED").length,
    checked_in: inRange.filter((i) => i.appointment_status === "CHECKED_IN").length,
    completed_today: inRange.filter((i) => i.appointment_status === "COMPLETED").length,
    failed_no_show: inRange.filter(
      (i) => i.appointment_status === "NO_SHOW" || i.appointment_status === "CANCELLED",
    ).length,
  };
}

function findIndex(id: string): number {
  return store.findIndex((i) => i.id === id);
}

function applyWorkflow(
  id: string,
  action: VisitAppointmentActionKey,
): VisitAppointmentWorkflowResponse {
  const idx = findIndex(id);
  if (idx < 0) throw new Error("Appointment not found.");
  const item = store[idx];
  const next = nextStatusForAction(action, item.appointment_status);
  if (!next) throw new Error("Invalid workflow transition for current appointment status.");

  const ts = nowIso();
  let checked_in_at = item.checked_in_at;
  let completed_at = item.completed_at;
  let cancelled_at = item.cancelled_at;

  if (next === "CHECKED_IN") checked_in_at = ts;
  if (next === "COMPLETED") completed_at = ts;
  if (next === "NO_SHOW") cancelled_at = ts;

  const updated = buildItem({
    ...item,
    appointment_status: next,
    status_updated_at: ts,
    checked_in_at,
    completed_at,
    cancelled_at,
  });
  store[idx] = updated;

  const messages: Record<VisitAppointmentActionKey, string> = {
    confirm: "Appointment confirmed.",
    check_in: "Patient checked in.",
    complete: "Visit marked complete.",
    mark_no_show: "Marked as no show.",
  };

  return {
    success: true,
    appointment_status: next,
    message: messages[action],
    appointment_id: item.appointment_id,
    allowed_actions: updated.allowed_actions,
    workflow_hint: updated.workflow_hint,
    status_updated_at: ts,
    checked_in_at,
    completed_at,
    cancelled_at,
  };
}

export async function mockConfirmVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  await delay();
  return applyWorkflow(id, "confirm");
}

export async function mockCheckInVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  await delay();
  return applyWorkflow(id, "check_in");
}

export async function mockCompleteVisitAppointment(id: string): Promise<VisitAppointmentWorkflowResponse> {
  await delay();
  return applyWorkflow(id, "complete");
}

export async function mockMarkNoShowVisitAppointment(
  id: string,
  _reason?: string,
): Promise<VisitAppointmentWorkflowResponse> {
  await delay();
  return applyWorkflow(id, "mark_no_show");
}

/** Reset store for tests. */
export function resetVisitAppointmentsMockStore(seed?: VisitAppointmentListItem[]): void {
  if (seed) {
    store = seed.map((s) => buildItem(s));
    return;
  }
  // Re-init by re-running module is not possible; tests will use reset with explicit seed
}

export function getVisitAppointmentsMockStore(): VisitAppointmentListItem[] {
  return store;
}
